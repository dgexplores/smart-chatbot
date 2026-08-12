import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// Config validates env at import time — set it before loading app modules.
process.env.JWT_SECRET = 'demo-seed-secret-123456789';
process.env.MOCK_LLM = 'true';
process.env.NODE_ENV = 'test';

const { seedDemoData } = await import('./seedDemo.js');
const { User } = await import('../models/User.js');
const { Lead } = await import('../models/Lead.js');
const { Conversation } = await import('../models/Conversation.js');
const { Message } = await import('../models/Message.js');
const { Proposal } = await import('../models/Proposal.js');
const { Meeting } = await import('../models/Meeting.js');
const { Notification } = await import('../models/Notification.js');
const { CompetitorPrice } = await import('../models/CompetitorPrice.js');
const { PricingConfig } = await import('../models/PricingConfig.js');

let mongod: MongoMemoryServer | null = null;

describe('demo data seeder', () => {
  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri('asep'));
    // The seeder needs the executive user (normally created by seedDatabase).
    await User.create({
      firstName: 'Sales',
      lastName: 'Executive',
      email: 'executive@example.com',
      password: 'ExecPassword123!',
      role: 'executive',
      isActive: true
    });
  }, 180_000);

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod?.stop();
  }, 60_000);

  it('seeds a realistic, dashboard-ready demo dataset', { timeout: 60_000 }, async () => {
    await seedDemoData();

    const leads = await Lead.find();
    expect(leads.length).toBe(10);

    // Pipeline spread: multiple statuses are represented
    const statuses = new Set(leads.map((l) => l.status));
    expect(statuses.has('NEW')).toBe(true);
    expect(statuses.has('MEETING_SCHEDULED')).toBe(true);
    expect(statuses.has('WON')).toBe(true);
    expect(statuses.has('LOST')).toBe(true);

    // Conversations + messages exist
    const conversations = await Conversation.find();
    expect(conversations.length).toBe(10);
    const messages = await Message.find();
    expect(messages.length).toBeGreaterThan(30);

    // Proposals include outcomes that feed the adaptive pricing loop
    const proposals = await Proposal.find();
    expect(proposals.some((p) => p.status === 'APPROVED')).toBe(true);
    expect(proposals.some((p) => p.status === 'REJECTED')).toBe(true);
    expect(proposals.every((p) => p.services.length > 0 && p.pricingVersion)).toBe(true);

    // Meetings + notifications for the dashboard
    expect(await Meeting.countDocuments()).toBeGreaterThanOrEqual(2);
    expect(await Notification.countDocuments()).toBeGreaterThanOrEqual(2);

    // Market observations across weeks + a rate-card history (v1 -> v2)
    const obs = await CompetitorPrice.find();
    expect(obs.length).toBeGreaterThanOrEqual(40);
    const config = await PricingConfig.findOne({ isActive: true });
    expect(config?.version).toBe(2);
    expect(config?.rates.find((r) => r.service === 'WEB_DEVELOPMENT')?.multiplier).toBe(0.95);

    // Idempotency: running again must not duplicate anything
    await seedDemoData();
    expect(await Lead.countDocuments()).toBe(10);
    expect(await Proposal.countDocuments()).toBe(proposals.length);
  });
});
