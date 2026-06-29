import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import { seedDatabase } from './utils/seed.js';
import { initializeQdrant } from './services/rag.js';
import authRoutes from './routes/auth.js';
import knowledgeRoutes from './routes/knowledge.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { Lead } from './models/Lead.js';
import { Conversation } from './models/Conversation.js';
import { Message } from './models/Message.js';
import { Meeting } from './models/Meeting.js';
import { Proposal } from './models/Proposal.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Connect to Database
await connectDB();
// Seed Database
await seedDatabase();
// Initialize Qdrant
await initializeQdrant();

const app = express();
const port = process.env.PORT || 5001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Global Rate Limiting: max 100 requests per minute
app.use(rateLimiter(100, 60 * 1000));

// Mount Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/knowledge', knowledgeRoutes);

// REST APIs for Leads & Sessions (Required for Executive Dashboard & Chat History Sync)
app.get('/api/v1/leads', async (req, res) => {
  try {
    const leads = await Lead.find().sort({ updatedAt: -1 });
    res.json({ success: true, data: leads });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/v1/sessions/:sessionId', async (req, res) => {
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

app.post('/api/v1/sessions', async (req, res) => {
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

app.patch('/api/v1/leads/:leadId', async (req, res) => {
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
    const { getIO } = await import('./sockets/socket.js');
    try {
      getIO().to('executives').emit('lead:updated', lead);
    } catch (e) {}

    res.json({ success: true, lead });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Static Assets
app.use('/proposals', express.static(path.join(__dirname, '../public/proposals')));

// Basic Routes
app.get('/', (req, res) => {
  res.json({ success: true, message: 'ASEP API is online.' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create Server
const server = http.createServer(app);

// Initialize Sockets
import { initSocket } from './sockets/socket.js';
initSocket(server);

server.listen(port, () => {
  console.log(`[Server] ASEP backend listening at http://localhost:${port}`);
  console.log(`[Server] Environment: ${process.env.NODE_ENV}`);
});
