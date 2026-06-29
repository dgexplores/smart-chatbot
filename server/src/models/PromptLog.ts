import mongoose, { Schema, Document } from 'mongoose';

export interface IPromptLog extends Document {
  conversationId?: mongoose.Types.ObjectId;
  prompt: string;
  response: string;
  tokensUsed?: number;
  aiModel?: string;
  latency?: number; // in ms
  createdAt: Date;
}

const PromptLogSchema = new Schema<IPromptLog>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', index: true },
    prompt: { type: String, required: true },
    response: { type: String, required: true },
    tokensUsed: { type: Number },
    aiModel: { type: String },
    latency: { type: Number }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

export const PromptLog = mongoose.model<IPromptLog>('PromptLog', PromptLogSchema);
