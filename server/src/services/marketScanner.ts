import { MarketTarget, IMarketTarget } from '../models/MarketTarget.js';
import { CompetitorPrice } from '../models/CompetitorPrice.js';
import { config } from '../config/env.js';

/** Plausible bounds for a single service quote in INR. */
const MIN_PRICE = 500;
const MAX_PRICE = 20_000_000;

/**
 * Extracts INR price candidates from a pricing page.
 *
 * Strategy 1 (preferred): structured data — parse JSON-LD blocks and walk for
 * `offers.price` / `price` values (INR or currency-less).
 * Strategy 2 (fallback): scan for "₹" amounts, honouring lakh/crore/k suffixes.
 *
 * Returns the deduplicated, plausibility-filtered list of price candidates.
 * Exported for unit testing.
 */
export const extractPricesFromHtml = (html: string): number[] => {
  const prices = new Set<number>();

  // --- Strategy 1: JSON-LD structured data ---
  const jsonLdBlocks = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) ?? [];
  for (const block of jsonLdBlocks) {
    const raw = block.replace(/<script[^>]*>/gi, '').replace(/<\/script>/gi, '').trim();
    if (!raw) continue;

    let data: any;
    try {
      data = JSON.parse(raw);
    } catch {
      continue;
    }

    const visit = (node: any): void => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) {
        node.forEach(visit);
        return;
      }
      const price = node.price ?? node.highPrice ?? node.lowPrice;
      const currency = node.priceCurrency ?? '';
      if (price !== undefined && price !== null && (!currency || currency.toUpperCase() === 'INR')) {
        const num = typeof price === 'string' ? parseFloat(price.replace(/[^\d.]/g, '')) : price;
        if (Number.isFinite(num)) prices.add(num);
      }
      Object.values(node).forEach((v) => {
        if (v && typeof v === 'object') visit(v);
      });
    };

    visit(data);
  }

  // --- Strategy 2: plain "₹" amounts (only if structured data found nothing) ---
  if (prices.size === 0) {
    const rupeeRegex = /₹\s*([\d,]+(?:\.\d+)?)\s*(lakhs?|lac|lakh|crores?|k)?/gi;
    let match: RegExpExecArray | null;
    while ((match = rupeeRegex.exec(html)) !== null) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      const suffix = (match[2] ?? '').toLowerCase();
      let value = amount;
      if (suffix.startsWith('crore') || suffix === 'cr') value = amount * 10_000_000;
      else if (suffix.startsWith('lakh') || suffix.startsWith('lac')) value = amount * 100_000;
      else if (suffix === 'k') value = amount * 1_000;
      if (Number.isFinite(value)) prices.add(value);
    }
  }

  return [...prices].filter((p) => p >= MIN_PRICE && p <= MAX_PRICE);
};

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/**
 * Fetches a single target's pricing page and records an observation.
 * Returns the recorded price, or null when nothing usable was extracted.
 */
export const scanTarget = async (target: IMarketTarget): Promise<number | null> => {
  const response = await fetch(target.url, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${target.url}`);
  }
  const html = await response.text();
  const prices = extractPricesFromHtml(html);

  if (prices.length === 0) {
    target.lastError = 'No prices extracted';
    target.lastScannedAt = new Date();
    await target.save();
    console.warn(`[MarketScanner] ${target.competitor} (${target.service}): no prices found at ${target.url}`);
    return null;
  }

  const price = median(prices);
  await CompetitorPrice.create({
    service: target.service,
    competitor: target.competitor,
    price,
    capturedAt: new Date()
  });

  target.lastScannedAt = new Date();
  target.lastError = undefined;
  await target.save();

  console.log(`[MarketScanner] ${target.competitor} (${target.service}): captured ₹${price.toLocaleString('en-IN')} from ${prices.length} candidates`);
  return price;
};

/** Scans every enabled target whose refresh window has elapsed. */
export const scanDueTargets = async (): Promise<number> => {
  const targets = await MarketTarget.find({ enabled: true });
  let scanned = 0;

  for (const target of targets) {
    if (target.lastScannedAt) {
      const due = target.lastScannedAt.getTime() + target.intervalHours * 60 * 60 * 1000;
      if (Date.now() < due) continue;
    }
    try {
      await scanTarget(target);
      scanned += 1;
    } catch (error: any) {
      target.lastError = String(error?.message ?? error);
      target.lastScannedAt = new Date();
      await target.save();
      console.error(`[MarketScanner] Failed to scan ${target.competitor} (${target.url}):`, target.lastError);
    }
  }

  return scanned;
};

/**
 * Runs the market scanner now and then on the configured interval so
 * competitor rates keep refreshing over time.
 */
export const startMarketScanner = (): void => {
  scanDueTargets().catch((error) => console.error('[MarketScanner] Initial scan failed:', error));
  const intervalMs = config.marketScanHours * 60 * 60 * 1000;
  setInterval(() => {
    scanDueTargets().catch((error) => console.error('[MarketScanner] Scan failed:', error));
  }, intervalMs).unref();
  console.log(`[MarketScanner] Scheduled market scans every ${config.marketScanHours}h.`);
};
