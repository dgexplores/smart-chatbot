import mongoose, { Schema, Document } from 'mongoose';

export interface ICompetitorPrice extends Document {
  service: string;
  competitor: string;
  price: number;
  capturedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CompetitorPriceSchema = new Schema<ICompetitorPrice>(
  {
    service: { type: String, required: true, index: true },
    competitor: { type: String, required: true, trim: true },
    price: { type: Number, required: true },
    capturedAt: { type: Date, default: Date.now, required: true, index: true }
  },
  {
    timestamps: true
  }
);

// Time-series index: latest price per competitor per service
CompetitorPriceSchema.index({ service: 1, competitor: 1, capturedAt: -1 });

export const CompetitorPrice = mongoose.model<ICompetitorPrice>('CompetitorPrice', CompetitorPriceSchema);
