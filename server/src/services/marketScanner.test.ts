import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractPricesFromHtml, scanDueTargets } from './marketScanner.js';
import { MarketTarget } from '../models/MarketTarget.js';
import { CompetitorPrice } from '../models/CompetitorPrice.js';

vi.mock('../config/env.js', () => ({
  config: { marketScanHours: 24 }
}));

vi.mock('../models/MarketTarget.js', () => ({
  MarketTarget: { find: vi.fn() }
}));

vi.mock('../models/CompetitorPrice.js', () => ({
  CompetitorPrice: { create: vi.fn().mockResolvedValue({}) }
}));

beforeEach(() => {
  vi.clearAllMocks();
  (MarketTarget.find as any).mockResolvedValue([]);
});

describe('extractPricesFromHtml', () => {
  it('extracts prices from JSON-LD structured data', () => {
    const html = `
      <html><head>
        <script type="application/ld+json">
        {"@type":"Product","name":"Web Design","offers":{"price":"45000","priceCurrency":"INR"}}
        </script>
      </head></html>`;

    expect(extractPricesFromHtml(html)).toEqual([45000]);
  });

  it('prefers structured data over plain rupee amounts on the same page', () => {
    const html = `
      <script type="application/ld+json">
      [{"@type":"Offer","price":120000,"priceCurrency":"INR"}]
      </script>
      <p>Starting at ₹1,50,000</p>`;

    // JSON-LD wins; the ₹ text is ignored when structured data exists.
    expect(extractPricesFromHtml(html)).toEqual([120000]);
  });

  it('parses plain rupee amounts with lakh suffixes', () => {
    const html = '<p>Starter sites from ₹25,000. Custom portals from ₹2.5 Lakhs.</p>';
    expect(extractPricesFromHtml(html)).toEqual([25000, 250000]);
  });

  it('returns an empty list for pages with no plausible prices', () => {
    const html = '<html><body><h1>Contact us for pricing</h1></body></html>';
    expect(extractPricesFromHtml(html)).toEqual([]);
  });

  it('filters out implausible amounts', () => {
    const html = '<p>Just ₹99 today, or ₹25,00,000 premium.</p>';
    // 99 is below the floor, 25,00,000 is within bounds
    expect(extractPricesFromHtml(html)).toEqual([2500000]);
  });
});

describe('scanDueTargets', () => {
  it('skips targets whose refresh window has not elapsed', async () => {
    const recent = {
      service: 'SEO',
      competitor: 'Competitor A',
      url: 'https://example.com/pricing',
      intervalHours: 168,
      enabled: true,
      lastScannedAt: new Date(),
      lastError: undefined,
      save: vi.fn().mockResolvedValue(true)
    };
    (MarketTarget.find as any).mockResolvedValue([recent]);

    const scanned = await scanDueTargets();

    expect(scanned).toBe(0);
    expect(CompetitorPrice.create).not.toHaveBeenCalled();
  });

  it('scans due targets and records observations', async () => {
    const due = {
      service: 'SEO',
      competitor: 'Competitor A',
      url: 'https://example.com/pricing',
      intervalHours: 1,
      enabled: true,
      lastScannedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      lastError: undefined,
      save: vi.fn().mockResolvedValue(true)
    };
    (MarketTarget.find as any).mockResolvedValue([due]);

    // Mock the fetch call with a page containing a price
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue('<p>SEO packages from ₹30,000/month.</p>')
    }));

    const scanned = await scanDueTargets();

    expect(scanned).toBe(1);
    expect(CompetitorPrice.create).toHaveBeenCalledWith(
      expect.objectContaining({ service: 'SEO', competitor: 'Competitor A', price: 30000 })
    );
    expect(due.lastScannedAt).toBeInstanceOf(Date);
    expect(due.save).toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('records the error and moves on when a fetch fails', async () => {
    const due = {
      service: 'WEB_DEVELOPMENT',
      competitor: 'Competitor B',
      url: 'https://example.com/broken',
      intervalHours: 1,
      enabled: true,
      lastScannedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      lastError: undefined,
      save: vi.fn().mockResolvedValue(true)
    };
    (MarketTarget.find as any).mockResolvedValue([due]);

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    const scanned = await scanDueTargets();

    expect(scanned).toBe(0);
    expect(due.lastError).toContain('network down');
    expect(due.save).toHaveBeenCalled();
    expect(CompetitorPrice.create).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});
