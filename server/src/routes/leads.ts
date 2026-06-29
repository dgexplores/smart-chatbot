import { Router, Response } from 'express';
import { authenticate, restrictTo, AuthenticatedRequest } from '../middleware/auth.js';
import { Lead } from '../models/Lead.js';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { Meeting } from '../models/Meeting.js';
import { Proposal } from '../models/Proposal.js';
import mongoose from 'mongoose';

const router = Router();

// Only admin/executives can view all leads
router.get('/', authenticate, restrictTo('admin', 'executive'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const leads = await Lead.find({ isDeleted: false }).sort({ updatedAt: -1 });
    res.json({ success: true, data: leads });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Only admin/executives can update a lead
router.patch('/:leadId', authenticate, restrictTo('admin', 'executive'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { leadId } = req.params;
    const { notes, reminders } = req.body;
    
    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    if (notes !== undefined) lead.notes = notes;
    if (reminders !== undefined) lead.reminders = reminders;

    await lead.save();

    // Notify executives over socket
    const { getIO } = await import('../sockets/socket.js');
    try {
      getIO().to('executives').emit('lead:updated', lead);
    } catch (e) {}

    res.json({ success: true, lead });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Fetch a session by ID (open for visitor chat widget history, but also used by executives)
router.get('/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const conversation = await Conversation.findOne({ sessionId });
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    const messages = await Message.find({ conversationId: conversation._id }).sort({ timestamp: 1 });
    
    // Find active meeting or generated proposal
    const lead = await Lead.findOne({ sessionId });
    let meeting = null;
    let proposal = null;
    if (lead) {
      meeting = await Meeting.findOne({ leadId: lead._id, status: 'REQUESTED' }).sort({ createdAt: -1 });
      proposal = await Proposal.findOne({ leadId: lead._id }).sort({ createdAt: -1 });
    }

    res.json({ success: true, messages, conversation, lead, meeting, proposal });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create/initiate a session (open for visitor chat widget)
router.post('/sessions', async (req, res) => {
  try {
    const { sessionId, source } = req.body;
    let conversation = await Conversation.findOne({ sessionId });
    if (!conversation) {
      conversation = new Conversation({
        sessionId,
        currentStage: 'GREETING',
        conversationStatus: 'ACTIVE',
        handoffStatus: 'NONE'
      });
      await conversation.save();
    }
    let lead = await Lead.findOne({ sessionId });
    if (!lead) {
      lead = new Lead({
        sessionId,
        leadScore: 0,
        leadPriority: 'LOW',
        status: 'NEW',
        source: source || 'website'
      });
      await lead.save();
    }
    conversation.leadId = lead._id as mongoose.Types.ObjectId;
    await conversation.save();
    res.json({ success: true, sessionId, conversation, lead });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
