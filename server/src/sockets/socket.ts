import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { Lead } from '../models/Lead.js';
import { AgentOrchestrator } from '../agents/orchestrator.js';

let io: Server | null = null;

export const initSocket = (server: HttpServer): Server => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Socket auth handshake middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      // Allow visitor widgets to connect unauthenticated
      socket.data.user = null;
      return next();
    }

    try {
      const secret = process.env.JWT_SECRET || 'asep_super_secret_jwt_key_2026';
      const decoded = jwt.verify(token, secret);
      socket.data.user = decoded;
      next();
    } catch (err) {
      // Discard invalid token but allow connection as guest/visitor
      socket.data.user = null;
      next();
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Join room based on session ID (for customer chat session synchronization)
    socket.on('session:join', (sessionId: string) => {
      if (sessionId) {
        socket.join(sessionId);
        console.log(`[Socket] Client ${socket.id} joined session room: ${sessionId}`);
      }
    });

    // Join executive dashboard channel
    socket.on('executive:join', () => {
      if (!socket.data.user || !['admin', 'executive'].includes(socket.data.user.role)) {
        console.warn(`[Socket] Unauthorized room join attempt from socket ID: ${socket.id}`);
        return socket.emit('error', { message: 'Unauthorized. Authenticated session required.' });
      }
      socket.join('executives');
      console.log(`[Socket] Authenticated Executive ${socket.data.user.email} joined dashboard room`);
    });

    // Customer / Executive typing indicators
    socket.on('chat:typing', ({ sessionId, isTyping, sender }) => {
      socket.to(sessionId).emit('chat:typing', { isTyping, sender });
      if (sender === 'CUSTOMER') {
        // Also notify monitoring executives
        socket.to('executives').emit('chat:typing', { sessionId, isTyping, sender });
      }
    });

    // Handle incoming client messages
    socket.on('chat:message', async ({ sessionId, message, sender, senderId }) => {
      try {
        // Find or create conversation
        let conversation = await Conversation.findOne({ sessionId });
        if (!conversation) {
          conversation = new Conversation({ sessionId });
          await conversation.save();
        }

        // Create and save message
        const newMessage = new Message({
          conversationId: conversation._id,
          sender,
          senderId,
          message,
          messageType: 'TEXT',
          timestamp: new Date()
        });
        await newMessage.save();

        // Broadcast message to session room (reaches other device tabs or took over executive)
        io?.to(sessionId).emit('chat:message', newMessage);

        // If customer sent it and AI is active, trigger AI conversation service
        if (sender === 'CUSTOMER' && conversation.conversationStatus === 'ACTIVE') {
          // Trigger the AI response event
          io?.to(sessionId).emit('chat:typing', { isTyping: true, sender: 'AI' });
          
          // Emit a local server event to process AI response asynchronously
          processAIResponse(sessionId, message);
        }

        // Send real-time log to executive monitoring dashboard
        io?.to('executives').emit('conversation:message_logged', {
          sessionId,
          message: newMessage
        });
      } catch (error) {
        console.error(`[Socket] Error handling chat:message:`, error);
        socket.emit('error', { message: 'Failed to process message.' });
      }
    });

    // Admin/Executive Takeover
    socket.on('executive:takeover', async ({ sessionId, executiveId }) => {
      try {
        const conversation = await Conversation.findOne({ sessionId });
        if (conversation) {
          conversation.conversationStatus = 'PAUSED'; // Pause AI responses
          conversation.handoffStatus = 'ACTIVE';
          conversation.executiveId = executiveId;
          await conversation.save();

          // Save System Takeover Notification Message
          const systemMsg = new Message({
            conversationId: conversation._id,
            sender: 'SYSTEM',
            message: 'A human consultant has joined the conversation.',
            messageType: 'ACTION',
            timestamp: new Date()
          });
          await systemMsg.save();

          // Notify room
          io?.to(sessionId).emit('chat:message', systemMsg);
          io?.to(sessionId).emit('executive:takeover_status', {
            isTakeoverActive: true,
            executiveId
          });

          // Sync lead status
          const lead = await Lead.findOne({ sessionId });
          if (lead) {
            lead.executiveAssigned = executiveId;
            lead.status = 'NEGOTIATION';
            await lead.save();
            io?.to('executives').emit('lead:updated', lead);
          }

          console.log(`[Socket] Executive ${executiveId} took over session ${sessionId}`);
        }
      } catch (error) {
        console.error(`[Socket] Error during takeover:`, error);
      }
    });

    // Admin/Executive Release Takeover (Return to AI)
    socket.on('executive:release', async ({ sessionId }) => {
      try {
        const conversation = await Conversation.findOne({ sessionId });
        if (conversation) {
          conversation.conversationStatus = 'ACTIVE'; // Resume AI responses
          conversation.handoffStatus = 'RELEASED';
          await conversation.save();

          // Save System Release Message
          const systemMsg = new Message({
            conversationId: conversation._id,
            sender: 'SYSTEM',
            message: 'Control returned to AI Sales Assistant.',
            messageType: 'ACTION',
            timestamp: new Date()
          });
          await systemMsg.save();

          // Notify room
          io?.to(sessionId).emit('chat:message', systemMsg);
          io?.to(sessionId).emit('executive:takeover_status', {
            isTakeoverActive: false
          });

          console.log(`[Socket] Takeover released for session ${sessionId}`);
        }
      } catch (error) {
        console.error(`[Socket] Error during release:`, error);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error('[Socket] Socket.io has not been initialized!');
  }
  return io;
};

// Placeholder AI processing function. We will implement the real AI Engine in Phase 5.
const processAIResponse = async (sessionId: string, customerMessage: string) => {
  // Trigger orchestrator loop in background to process and generate AI response
  try {
    const replyText = await AgentOrchestrator.processMessage(sessionId, customerMessage);

    // Double check if conversation is still active (hasn't been taken over during generation)
    const conversation = await Conversation.findOne({ sessionId });
    if (!conversation || conversation.conversationStatus !== 'ACTIVE') {
      console.log(`[Socket] AI response generated but conversation status is not ACTIVE. Aborting broadcast.`);
      return;
    }

    const aiMessage = new Message({
      conversationId: conversation._id,
      sender: 'AI',
      message: replyText,
      messageType: 'TEXT',
      timestamp: new Date()
    });
    await aiMessage.save();

    // Broadcast AI response and stop typing
    io?.to(sessionId).emit('chat:typing', { isTyping: false, sender: 'AI' });
    io?.to(sessionId).emit('chat:message', aiMessage);

    // Update monitoring executives
    io?.to('executives').emit('conversation:message_logged', {
      sessionId,
      message: aiMessage
    });
  } catch (error) {
    console.error(`[Socket] AI response processing error:`, error);
    io?.to(sessionId).emit('chat:typing', { isTyping: false, sender: 'AI' });
  }
};
