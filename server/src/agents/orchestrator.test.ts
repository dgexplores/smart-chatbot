import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentOrchestrator } from './orchestrator.js';
import { Conversation } from '../models/Conversation.js';
import { Lead } from '../models/Lead.js';
import { Message } from '../models/Message.js';
import { Meeting } from '../models/Meeting.js';
import { Proposal } from '../models/Proposal.js';
import { generateAIResponse } from '../services/ai.js';
import { sendEmail } from '../services/email.js';
import type { AIResponse } from '../services/ai.js';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('../config/env.js', () => ({
  config: { publicBaseUrl: 'http://test.local' }
}));

vi.mock('../models/Conversation.js', () => {
  const Conversation = vi.fn(function (this: any, init: any = {}) {
    return {
      sessionId: 'session-1',
      currentStage: 'GREETING',
      conversationStatus: 'ACTIVE',
      handoffStatus: 'NONE',
      leadId: undefined,
      save: vi.fn().mockResolvedValue(true),
      ...init
    };
  });
  (Conversation as any).findOne = vi.fn();
  return { Conversation };
});

vi.mock('../models/Lead.js', () => {
  const Lead = vi.fn(function (this: any, init: any = {}) {
    return {
      sessionId: 'session-1',
      leadScore: 0,
      leadPriority: 'LOW',
      status: 'NEW',
      source: 'website',
      save: vi.fn().mockResolvedValue(true),
      ...init
    };
  });
  (Lead as any).findOne = vi.fn();
  return { Lead };
});

vi.mock('../models/Message.js', () => {
  const Message = vi.fn();
  (Message as any).find = vi.fn(() => ({
    sort: vi.fn(() => ({
      limit: vi.fn().mockResolvedValue([])
    }))
  }));
  return { Message };
});

vi.mock('../models/Meeting.js', () => ({
  Meeting: { findOne: vi.fn() }
}));

vi.mock('../models/Proposal.js', () => ({
  Proposal: { findOne: vi.fn() }
}));

vi.mock('../services/ai.js', () => ({
  generateAIResponse: vi.fn()
}));

vi.mock('../services/rag.js', () => ({
  retrieveFromRAG: vi.fn().mockResolvedValue([])
}));

vi.mock('../services/email.js', () => ({
  sendEmail: vi.fn().mockResolvedValue(true)
}));

vi.mock('../services/pdf.js', () => ({
  generateProposalPDF: vi.fn()
}));

vi.mock('../sockets/socket.js', () => ({
  getIO: () => ({ to: () => ({ emit: () => {} }) })
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeAIResponse = (overrides: Partial<AIResponse> = {}): AIResponse => ({
  reply: 'Thanks for sharing!',
  stage: 'QUALIFICATION',
  confidence: 0.95,
  leadScore: 60,
  customerData: {},
  requirements: {},
  recommendations: [],
  actions: [],
  ...overrides
});

/** Instances created via `new Model(...)` during the test (from vi.fn mock results). */
const createdInstances = (ctor: any): any[] => ctor.mock.results.map((r: any) => r.value);

const existingConversation = (overrides: any = {}) => ({
  sessionId: 'session-1',
  currentStage: 'QUALIFICATION',
  conversationStatus: 'ACTIVE',
  handoffStatus: 'NONE',
  leadId: 'lead-1',
  save: vi.fn().mockResolvedValue(true),
  ...overrides
});

const existingLead = (overrides: any = {}) => ({
  _id: 'lead-1',
  sessionId: 'session-1',
  leadScore: 60,
  leadPriority: 'HIGH',
  status: 'QUALIFIED',
  email: 'existing@example.com',
  save: vi.fn().mockResolvedValue(true),
  ...overrides
});

beforeEach(() => {
  vi.clearAllMocks();
  (Conversation.findOne as any).mockResolvedValue(null);
  (Lead.findOne as any).mockResolvedValue(null);
  (Meeting.findOne as any).mockResolvedValue(null);
  (Proposal.findOne as any).mockResolvedValue(null);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AgentOrchestrator.processMessage', () => {
  it('creates a conversation and lead, then transitions stage on the first message', async () => {
    vi.mocked(generateAIResponse).mockResolvedValue(
      makeAIResponse({
        reply: 'Tell me about your business!',
        stage: 'DISCOVERY',
        customerData: { customerName: 'Aarav' },
        actions: ['SAVE_LEAD']
      })
    );

    const reply = await AgentOrchestrator.processMessage('session-1', 'Hi, I need a website');

    expect(reply).toBe('Tell me about your business!');

    const conversations = createdInstances(Conversation);
    expect(conversations).toHaveLength(1);
    expect(conversations[0].currentStage).toBe('DISCOVERY');

    const leads = createdInstances(Lead);
    expect(leads).toHaveLength(1);
    expect(leads[0].customerName).toBe('Aarav');
    expect(leads[0].save).toHaveBeenCalled();

    expect(Message.find).toHaveBeenCalled();
  });

  it('keeps the current stage when the AI returns the same stage', async () => {
    const conversation = existingConversation({ currentStage: 'DISCOVERY' });
    (Conversation.findOne as any).mockResolvedValue(conversation);
    (Lead.findOne as any).mockResolvedValue(existingLead());

    vi.mocked(generateAIResponse).mockResolvedValue(
      makeAIResponse({ stage: 'DISCOVERY', actions: ['UPDATE_LEAD'] })
    );

    await AgentOrchestrator.processMessage('session-1', 'ok');

    expect(conversation.currentStage).toBe('DISCOVERY');
    // No leadId link and no stage change, so the conversation is never re-saved.
    expect(conversation.save).not.toHaveBeenCalled();
  });

  it('marks the conversation for human handoff when the AI requests it', async () => {
    const conversation = existingConversation();
    (Conversation.findOne as any).mockResolvedValue(conversation);
    (Lead.findOne as any).mockResolvedValue(existingLead());

    vi.mocked(generateAIResponse).mockResolvedValue(
      makeAIResponse({ stage: 'HANDOFF', confidence: 0.9, actions: ['HANDOFF'] })
    );

    await AgentOrchestrator.processMessage('session-1', 'I want to negotiate');

    expect(conversation.handoffStatus).toBe('PENDING');
    expect(conversation.save).toHaveBeenCalled();
  });

  it('sends the deferred meeting email when the customer email is first captured', async () => {
    const conversation = existingConversation();
    (Conversation.findOne as any).mockResolvedValue(conversation);
    const lead = existingLead({ email: undefined, status: 'NEW' });
    (Lead.findOne as any).mockResolvedValue(lead);
    (Meeting.findOne as any).mockResolvedValue({
      meetLink: 'https://meet.google.com/xyz',
      meetingDate: new Date('2026-08-12T15:00:00Z'),
      status: 'REQUESTED'
    });

    vi.mocked(generateAIResponse).mockResolvedValue(
      makeAIResponse({
        stage: 'QUALIFICATION',
        customerData: { email: 'riya@example.com' },
        requirements: { features: ['Custom Website'] },
        actions: ['SAVE_LEAD']
      })
    );

    await AgentOrchestrator.processMessage('session-1', 'My email is riya@example.com');

    expect(lead.email).toBe('riya@example.com');
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'riya@example.com' })
    );
  });

  it('does not email again when the customer email already existed', async () => {
    const conversation = existingConversation();
    (Conversation.findOne as any).mockResolvedValue(conversation);
    (Lead.findOne as any).mockResolvedValue(existingLead());

    vi.mocked(generateAIResponse).mockResolvedValue(
      makeAIResponse({
        stage: 'QUALIFICATION',
        customerData: { customerName: 'Sameer Kumar' },
        actions: ['UPDATE_LEAD']
      })
    );

    await AgentOrchestrator.processMessage('session-1', 'My name is Sameer Kumar');

    expect(Meeting.findOne).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
