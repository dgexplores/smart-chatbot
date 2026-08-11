import mongoose, { Schema, Document } from 'mongoose';

export interface IMarketTarget extends Document {
  service: string;
  competitor: string;
  url: string;
  intervalHours: number;
  enabled: boolean;
  lastScannedAt?: Date;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MarketTargetSchema = new Schema<IMarketTarget>(
  {
    service: { type: String, required: true, index: true },
    competitor: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    intervalHours: { type: Number, default: 168, required: true }, // weekly by default
    enabled: { type: Boolean, default: true, required: true },
    lastScannedAt: { type: Date },
    lastError: { type: String }
  },
  {
    timestamps: true
  }
);

export const MarketTarget = mongoose.model<IMarketTarget>('MarketTarget', MarketTargetSchema);
