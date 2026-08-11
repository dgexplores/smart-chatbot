import { describe, it, expect, vi, beforeEach } from 'vitest';
import { estimatePrice, getActiveRates, recomputeMultipliers, DEFAULT_RATES } from './pricing.js';
import { PricingConfig } from '../models/PricingConfig.js';
import { CompetitorPrice } from '../models/CompetitorPrice.js';
import { Proposal } from '../models/Proposal.js';
import { Lead } from '../models/Lead.js';

vi.mock('../config/env.js', () => ({
  config: { pricingRefreshHours: 24 }
}));

vi.mock('../models/PricingConfig.js', () => ({
  PricingConfig: {
    findOne: vi.fn(),
    create: vi.fn()
  }
}));

vi.mock('../models/CompetitorPrice.js', () => ({
  CompetitorPrice: { find: vi.fn() }
}));

vi.mock('../models/Proposal.js', () => ({
  Proposal: { find: vi.fn(), updateMany: vi.fn() }
}));

vi.mock('../models/Lead.js', () => ({
  Lead: { find: vi.fn() }
}));

const makeRate = (overrides: any = {}) => ({
  service: 'SEO',
  label: 'SEO',
  description: 'Ranking, backlinks, page-speed optimization.',
  basePrice: 25000,
  multiplier: 1,
  corridorMin: 0.7,
  corridorMax: 1.3,
  tiers: [],
  ...overrides
});

const makeConfig = (rates: any[]) => ({
  version: 5,
  isActive: true,
  rates,
  save: vi.fn().mockResolvedValue(true)
});

beforeEach(() => {
  vi.clearAllMocks();
  (PricingConfig.findOne as any).mockResolvedValue(null);
  (Proposal.find as any).mockResolvedValue([]);
  (Proposal.updateMany as any).mockResolvedValue({});
  (Lead.find as any).mockResolvedValue([]);
  (CompetitorPrice.find as any).mockResolvedValue([]);
});

describe('estimatePrice', () => {
  it('parses an explicit Lakhs budget as the quoted price', () => {
    const result = estimatePrice('Finance', [], '₹2.5 Lakhs', DEFAULT_RATES.rates);
    expect(result.estimatedCost).toBe(250000);
  });

  it('parses numeric budgets below 15 as lakhs', () => {
    const result = estimatePrice('Finance', [], '8 lakhs', DEFAULT_RATES.rates);
    expect(result.estimatedCost).toBe(800000);
  });

  it('detects services from features and applies the adaptive multiplier', () => {
    const rates = DEFAULT_RATES.rates.map((r) =>
      r.service === 'WEB_DEVELOPMENT' ? { ...r, multiplier: 1.2 } : r
    );

    const result = estimatePrice('', ['Custom Website Design', 'SEO Optimization'], undefined, rates);

    expect(result.services.sort()).toEqual(['SEO', 'UI_UX_DESIGN', 'WEB_DEVELOPMENT']);
    // WEB (85k x 1.2) + UI/UX (45k) + SEO (25k)
    expect(result.estimatedCost).toBe(Math.round(85000 * 1.2) + 45000 + 25000);
  });

  it('falls back to the DEFAULT rate when no feature matches', () => {
    const result = estimatePrice('', ['General consulting'], undefined, DEFAULT_RATES.rates);
    expect(result.services).toEqual(['DEFAULT']);
    expect(result.estimatedCost).toBe(35000);
  });
});

describe('getActiveRates', () => {
  it('returns the active rate card from the database', async () => {
    (PricingConfig.findOne as any).mockResolvedValue({
      version: 3,
      rates: [makeRate({ service: 'SEO' })]
    });

    const result = await getActiveRates();
    expect(result.version).toBe(3);
    expect(result.rates[0].service).toBe('SEO');
  });

  it('falls back to the in-memory defaults before the DB is seeded', async () => {
    const result = await getActiveRates();
    expect(result).toBe(DEFAULT_RATES);
  });
});

describe('recomputeMultipliers', () => {
  it('raises the multiplier for services with a high win rate', async () => {
    const rate = makeRate();
    const config = makeConfig([rate]);
    (PricingConfig.findOne as any).mockResolvedValue(config);

    const mkProposal = (status: string) => ({ status, services: ['SEO'], createdAt: new Date() });
    (Proposal.find as any).mockResolvedValue([
      mkProposal('APPROVED'),
      mkProposal('APPROVED'),
      mkProposal('APPROVED'),
      mkProposal('APPROVED'),
      mkProposal('APPROVED'),
      mkProposal('REJECTED')
    ]);

    await recomputeMultipliers();

    // 5/6 wins (0.83 > 0.6) -> +0.1
    expect(rate.multiplier).toBe(1.1);
    expect(config.version).toBe(6);
    expect(config.save).toHaveBeenCalled();
  });

  it('clamps a multiplier inside its corridor', async () => {
    const rate = makeRate({ multiplier: 0.5 });
    const config = makeConfig([rate]);
    (PricingConfig.findOne as any).mockResolvedValue(config);

    await recomputeMultipliers();

    expect(rate.multiplier).toBe(0.7); // clamped up to corridorMin
    expect(config.version).toBe(6);
    expect(config.save).toHaveBeenCalled();
  });

  it('does not write or bump the version when nothing changes', async () => {
    const rate = makeRate();
    const config = makeConfig([rate]);
    (PricingConfig.findOne as any).mockResolvedValue(config);

    await recomputeMultipliers();

    expect(config.version).toBe(5);
    expect(config.save).not.toHaveBeenCalled();
  });

  it('eases the price down when competitors sit well below our base price', async () => {
    const rate = makeRate({ service: 'WEB_DEVELOPMENT', basePrice: 85000 });
    const config = makeConfig([rate]);
    (PricingConfig.findOne as any).mockResolvedValue(config);
    (CompetitorPrice.find as any).mockResolvedValue([
      { service: 'WEB_DEVELOPMENT', price: 40000, capturedAt: new Date() },
      { service: 'WEB_DEVELOPMENT', price: 50000, capturedAt: new Date() }
    ]);

    await recomputeMultipliers();

    // median 45000 -> delta (45000-85000)/85000 ≈ -0.47, *0.5 ≈ -0.24, clamped to -0.15
    expect(rate.multiplier).toBe(0.85);
    expect(config.save).toHaveBeenCalled();
  });
});
