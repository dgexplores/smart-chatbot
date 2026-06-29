import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  conversationId: mongoose.Types.ObjectId;
  sender: 'CUSTOMER' | 'AI' | 'EXECUTIVE' | 'SYSTEM';
  senderId?: mongoose.Types.ObjectId;
  message: string;
  messageType: 'TEXT' | 'PROPOSAL' | 'NOTIFICATION' | 'SUMMARY' | 'ACTION';
  metadata?: Record<string, any>;
  timestamp: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    sender: {
      type: String,
      enum: ['CUSTOMER', 'AI', 'EXECUTIVE', 'SYSTEM'],
      required: true,
      index: true
    },
    senderId: { type: Schema.Types.ObjectId },
    message: { type: String, required: true },
    messageType: {
      type: String,
      enum: ['TEXT', 'PROPOSAL', 'NOTIFICATION', 'SUMMARY', 'ACTION'],
      default: 'TEXT',
      required: true
    },
    metadata: { type: Schema.Types.Map, of: Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now, required: true, index: true }
  }
);

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
