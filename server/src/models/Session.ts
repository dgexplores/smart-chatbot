import mongoose, { Schema, Document } from 'mongoose';

export interface ISession extends Document {
  sessionId: string;
  leadId?: mongoose.Types.ObjectId;
  ipAddress?: string;
  browser?: string;
  device?: string;
  location?: string;
  lastActivity: Date;
  expiresAt: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead' },
    ipAddress: { type: String },
    browser: { type: String },
    device: { type: String },
    location: { type: String },
    lastActivity: { type: Date, default: Date.now, required: true },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Default 30 days
    }
  }
);

// TTL Index for automatic expiration
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Session = mongoose.model<ISession>('Session', SessionSchema);
