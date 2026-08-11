import { PricingConfig, ServiceRate } from '../models/PricingConfig.js';
import { CompetitorPrice } from '../models/CompetitorPrice.js';
import { Proposal } from '../models/Proposal.js';
import { Lead } from '../models/Lead.js';
import { config } from '../config/env.js';

export type { ServiceRate };

export interface ActiveRates {
  version: number;
  rates: ServiceRate[];
}

export interface PriceEstimate {
  estimatedCost: number;
  services: string[];
}

/**
 * Default rate card. These values mirror the market ranges the AI consultant
 * originally quoted; from here on they live as data so they can be adjusted
 * and re-versioned without redeploying the prompt.
 */
export const DEFAULT_RATES: ActiveRates = {
  version: 1,
  rates: [
    {
      service: 'WEB_DEVELOPMENT',
      label: 'Web Designing & Development',
      description:
        'Custom React/Next.js design, mobile-first layouts, databases, and API integrations.',
      basePrice: 85000,
      multiplier: 1,
      corridorMin: 0.7,
      corridorMax: 1.3,
      tiers: [
        { name: 'Basic business sites', minPrice: 25000, maxPrice: 50000 },
        { name: 'Professional dynamic portals', minPrice: 100000, maxPrice: 250000 },
        { name: 'Custom enterprise SaaS systems', minPrice: 300000, maxPrice: 800000 }
      ]
    },
    {
      service: 'UI_UX_DESIGN',
      label: 'UI/UX Designing',
      description: 'Research, interactive wireframing, branding systems, and dynamic Figma mockups.',
      basePrice: 45000,
      multiplier: 1,
      corridorMin: 0.7,
      corridorMax: 1.3,
      tiers: [{ name: 'Figma wireframes & branding prototypes', minPrice: 25000, maxPrice: 100000 }]
    },
    {
      service: 'MOBILE_APP',
      label: 'Mobile Applications',
      description:
        'Native/cross-platform iOS & Android apps (Flutter, React Native) with store licensing, push notifications, and geolocation APIs.',
      basePrice: 450000,
      multiplier: 1,
      corridorMin: 0.7,
      corridorMax: 1.3,
      tiers: [{ name: 'iOS & Android apps', minPrice: 350000, maxPrice: 1000000 }]
    },
    {
      service: 'SEO',
      label: 'SEO',
      description: 'Ranking, backlinks, and page-speed optimization.',
      basePrice: 25000,
      multiplier: 1,
      corridorMin: 0.7,
      corridorMax: 1.3,
      tiers: [{ name: 'Ranking, backlinks, page-speed check (per month)', minPrice: 15000, maxPrice: 40000 }]
    },
    {
      service: 'CONTENT',
      label: 'Content Writing',
      description: 'High-quality SEO copywriting.',
      basePrice: 15000,
      multiplier: 1,
      corridorMin: 0.7,
      corridorMax: 1.3,
      tiers: [{ name: 'SEO copywriting (per month)', minPrice: 10000, maxPrice: 25000 }]
    },
    {
      service: 'MARKETING',
      label: 'Digital Marketing & PPC Ads Shield',
      description: 'Campaign setup and ad-fraud prevention block shield.',
      basePrice: 30000,
      multiplier: 1,
      corridorMin: 0.7,
      corridorMax: 1.3,
      tiers: [{ name: 'Campaign setup & ad fraud shield (per month)', minPrice: 25000, maxPrice: 60000 }]
    },
    {
      service: 'DEFAULT',
      label: 'Web Designing & Development',
      description: 'A custom website built to your requirements.',
      basePrice: 35000,
      multiplier: 1,
      corridorMin: 0.7,
      corridorMax: 1.3,
      tiers: [{ name: 'Basic custom service', minPrice: 25000, maxPrice: 85000 }]
    }
  ]
};

/**
 * Returns the currently active rate card (highest version), or the in-memory
 * defaults if the database has not been seeded yet.
 */
export const getActiveRates = async (): Promise<ActiveRates> => {
  const config = await PricingConfig.findOne({ isActive: true });
  if (config) {
    return { version: config.version, rates: config.rates };
  }
  return DEFAULT_RATES;
};

/** Seeds the default rate card on first boot. Idempotent. */
export const ensurePricingConfig = async (): Promise<void> => {
  const existing = await PricingConfig.findOne({ isActive: true });
  if (existing) return;

  await PricingConfig.create({
    version: DEFAULT_RATES.version,
    effectiveFrom: new Date(),
    isActive: true,
    rates: DEFAULT_RATES.rates
  });
  console.log(`[Pricing] Seeded default rate card v${DEFAULT_RATES.version}.`);
};

/**
 * Estimates a project price in INR.
 *
 * - If the customer stated a budget, it is parsed (e.g. "₹2.5 Lakhs" -> 250000)
 *   and returned as-is, since that is the number the customer expects to hear.
 * - Otherwise, requested features are matched against the rate card and each
 *   matched service contributes its base price multiplied by the current
 *   adaptive multiplier. Falls back to the DEFAULT rate when nothing matches.
 */
export const estimatePrice = (
  industry: string,
  features: string[],
  budgetStr: string | undefined,
  rates: ServiceRate[]
): PriceEstimate => {
  if (budgetStr) {
    const clean = budgetStr.toLowerCase();
    if (clean.includes('lakh') || clean.includes('l') || clean.includes('lk')) {
      const match = clean.match(/([\d.]+)/);
      if (match) {
        return { estimatedCost: Math.round(parseFloat(match[1]) * 100000), services: [] };
      }
    }
    const matchVal = clean.match(/([\d,]+)/);
    if (matchVal) {
      const val = parseInt(matchVal[1].replace(/,/g, ''), 10);
      if (val > 0) {
        if (val < 15) return { estimatedCost: val * 100000, services: [] };
        return { estimatedCost: val, services: [] };
      }
    }
  }

  const matchFeature = (feature: string, keywords: string[]): boolean => {
    const feat = feature.toLowerCase();
    return keywords.some((kw) => feat.includes(kw));
  };

  const keywordMap: Record<string, string[]> = {
    UI_UX_DESIGN: ['ui', 'ux', 'design', 'wireframe', 'figma'],
    MOBILE_APP: ['mobile', 'app', 'android', 'ios', 'flutter'],
    SEO: ['seo', 'optimization', 'ranking'],
    MARKETING: ['marketing', 'campaign', 'ad', 'ppc'],
    CONTENT: ['content', 'writing', 'blog'],
    WEB_DEVELOPMENT: ['web', 'site', 'e-commerce', 'ecommerce', 'portal']
  };

  let total = 0;
  const services: string[] = [];

  for (const feature of features) {
    for (const [service, keywords] of Object.entries(keywordMap)) {
      if (!matchFeature(feature, keywords)) continue;
      const rate = rates.find((r) => r.service === service);
      if (!rate) continue;
      total += Math.round(rate.basePrice * rate.multiplier);
      services.push(service);
    }
  }

  if (services.length === 0) {
    const fallback = rates.find((r) => r.service === 'DEFAULT') ?? DEFAULT_RATES.rates.find((r) => r.service === 'DEFAULT');
    total += Math.round((fallback?.basePrice ?? 35000) * (fallback?.multiplier ?? 1));
    services.push('DEFAULT');
  }

  return { estimatedCost: total, services };
};

/**
 * Recomputes each service's adaptive multiplier from:
 *  - win/loss feedback on recent proposals (winRate > 60% -> raise, < 35% -> lower)
 *  - competitor price position vs. our base price
 *  - lead-demand trend (last 7 days vs. the 7 before)
 *
 * Multipliers are clamped to each service's corridor so prices can never drift
 * outside a sane band. Only writes when something actually changed.
 */
export const recomputeMultipliers = async (): Promise<void> => {
  const config = await PricingConfig.findOne({ isActive: true });
  if (!config) return;

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const [proposals, leads, competitors] = await Promise.all([
    Proposal.find({ createdAt: { $gte: since } }),
    Lead.find({ createdAt: { $gte: twoWeeksAgo } }),
    CompetitorPrice.find({ capturedAt: { $gte: since } })
  ]);

  // Demand trend
  const recentLeads = leads.filter((l) => l.createdAt >= weekAgo).length;
  const prevLeads = leads.filter((l) => l.createdAt >= twoWeeksAgo && l.createdAt < weekAgo).length;
  const demandRatio = prevLeads > 0 ? recentLeads / prevLeads : 1;

  let changed = false;

  for (const rate of config.rates) {
    const serviceProps = proposals.filter((p) => p.services?.includes(rate.service));
    const wins = serviceProps.filter((p) => p.status === 'APPROVED').length;
    const losses = serviceProps.filter((p) => p.status === 'REJECTED').length;
    const compPrices = competitors.filter((c) => c.service === rate.service).map((c) => c.price);

    let target = rate.multiplier;

    // Win/loss feedback (needs a minimum sample size to be meaningful)
    if (wins + losses >= 5) {
      const winRate = wins / (wins + losses);
      if (winRate > 0.6) target += 0.1;
      else if (winRate < 0.35) target -= 0.1;
    }

    // Competitor position: if we are well above the market median, ease down;
    // if well below, allow the price to rise.
    if (compPrices.length > 0) {
      const sorted = [...compPrices].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      const delta = (median - rate.basePrice) / rate.basePrice;
      target += Math.min(Math.max(delta * 0.5, -0.15), 0.15);
    }

    // Demand trend
    if (demandRatio > 1.2) target += 0.05;
    else if (demandRatio < 0.8) target -= 0.05;

    const next = Math.round(Math.min(Math.max(target, rate.corridorMin), rate.corridorMax) * 100) / 100;
    if (next !== rate.multiplier) {
      rate.multiplier = next;
      changed = true;
    }
  }

  // Expire stale SENT proposals so they no longer count as live quotes.
  await Proposal.updateMany(
    { status: 'SENT', createdAt: { $lt: since } },
    { status: 'EXPIRED' }
  );

  if (changed) {
    config.version += 1;
    await config.save();
    console.log(`[Pricing] Rate card updated to v${config.version}:`, config.rates.map((r) => `${r.service}=${r.multiplier}`).join(', '));
  }
};

/**
 * Runs the adaptive pricing job periodically (and once at boot).
 */
export const startPricingJob = (): void => {
  const run = async (): Promise<void> => {
    try {
      await recomputeMultipliers();
    } catch (error) {
      console.error('[Pricing] Multiplier recompute failed:', error);
    }
  };

  // Run once at boot, then on the configured refresh interval so prices
  // keep adapting over time.
  run();
  const intervalMs = config.pricingRefreshHours * 60 * 60 * 1000;
  setInterval(run, intervalMs).unref();
  console.log(`[Pricing] Adaptive pricing job scheduled every ${config.pricingRefreshHours}h.`);
};
