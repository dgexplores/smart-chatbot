import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// The real config module validates env at import time — set it before loading
// any application modules.
process.env.JWT_SECRET = 'integration-secret-123456789';
process.env.MOCK_LLM = 'true';
process.env.NODE_ENV = 'test';
process.env.MARKET_SCAN_HOURS = '1';

const pricing = await import('./pricing.js');
const { scanDueTargets } = await import('./marketScanner.js');
const { MarketTarget } = await import('../models/MarketTarget.js');
const { Proposal } = await import('../models/Proposal.js');
const { PricingConfig } = await import('../models/PricingConfig.js');

let mongod: MongoMemoryServer | null = null;

describe('adaptive pricing end-to-end', () => {
  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri('asep'));
  }, 180_000);

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod?.stop();
  }, 60_000);

  it(
    'seeds the rate card, captures a real market rate, and re-tunes on win/loss feedback',
    { timeout: 180_000 },
    async () => {
      // 1. Seed the rate card
      await pricing.ensurePricingConfig();
      const seeded = await pricing.getActiveRates();
      expect(seeded.version).toBe(1);
      expect(seeded.rates.length).toBeGreaterThan(0);

      // 2. Register a real competitor pricing page and scan it (live fetch)
      const target = await MarketTarget.create({
        service: 'WEB_DEVELOPMENT',
        competitor: 'GoDaddy India',
        url: 'https://www.godaddy.com/en-in/websites/website-builder',
        intervalHours: 1,
        enabled: true
      });

      await scanDueTargets();

      const fresh = await MarketTarget.findById(target._id);
      expect(fresh?.lastScannedAt).toBeInstanceOf(Date);

      // 3. Seed deal feedback: 5 approved + 1 rejected for WEB_DEVELOPMENT
      const now = Date.now();
      const proposals = [1, 2, 3, 4, 5, 6].map((i) => ({
        leadId: new mongoose.Types.ObjectId(),
        proposalNumber: `INTEG-${now}-${i}`,
        version: 1,
        title: 'Integration proposal',
        features: ['Custom Website'],
        deliverables: ['Site'],
        timeline: '2 months',
        estimatedCost: 100000,
        services: ['WEB_DEVELOPMENT'],
        status: i <= 5 ? ('APPROVED' as const) : ('REJECTED' as const),
        paymentMilestones: []
      }));
      await Proposal.insertMany(proposals);

      // 4. Re-tune and confirm prices actually moved
      const before = await pricing.getActiveRates();
      await pricing.recomputeMultipliers();
      const after = await pricing.getActiveRates();

      const webBefore = before.rates.find((r) => r.service === 'WEB_DEVELOPMENT')!.multiplier;
      const webAfter = after.rates.find((r) => r.service === 'WEB_DEVELOPMENT')!.multiplier;

      // 5/6 win rate alone pushes +0.1, so the multiplier must have moved
      expect(webAfter).not.toBe(webBefore);
      expect(after.version).toBeGreaterThan(before.version);

      // 5. The persisted rate card is what the AI quotes next
      const persisted = await PricingConfig.findOne({ isActive: true });
      expect(persisted?.version).toBe(after.version);
      console.log(`[Integration] WEB_DEVELOPMENT multiplier: ${webBefore} -> ${webAfter} (v${before.version} -> v${after.version})`);
    }
  );
});
