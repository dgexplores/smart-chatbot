import mongoose, { Schema, Document } from 'mongoose';

export interface IConversation extends Document {
  leadId?: mongoose.Types.ObjectId;
  sessionId: string;
  currentStage:
    | 'GREETING'
    | 'DISCOVERY'
    | 'REQUIREMENT_COLLECTION'
    | 'BRAINSTORMING'
    | 'QUALIFICATION'
    | 'PACKAGE_RECOMMENDATION'
    | 'PROPOSAL_GENERATION'
    | 'HANDOFF'
    | 'CLOSED';
  aiSummary?: string;
  conversationStatus: 'ACTIVE' | 'COMPLETED' | 'PAUSED';
  handoffStatus: 'NONE' | 'PENDING' | 'ACTIVE' | 'RELEASED';
  executiveId?: mongoose.Types.ObjectId;
  startedAt: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', index: true },
    sessionId: { type: String, required: true, unique: true, index: true },
    currentStage: {
      type: String,
      enum: [
        'GREETING',
        'DISCOVERY',
        'REQUIREMENT_COLLECTION',
        'BRAINSTORMING',
        'QUALIFICATION',
        'PACKAGE_RECOMMENDATION',
        'PROPOSAL_GENERATION',
        'HANDOFF',
        'CLOSED'
      ],
      default: 'GREETING',
      required: true,
      index: true
    },
    aiSummary: { type: String },
    conversationStatus: {
      type: String,
      enum: ['ACTIVE', 'COMPLETED', 'PAUSED'],
      default: 'ACTIVE',
      required: true,
      index: true
    },
    handoffStatus: {
      type: String,
      enum: ['NONE', 'PENDING', 'ACTIVE', 'RELEASED'],
      default: 'NONE',
      required: true
    },
    executiveId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    startedAt: { type: Date, default: Date.now, required: true },
    endedAt: { type: Date }
  },
  {
    timestamps: true
  }
);

export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);
