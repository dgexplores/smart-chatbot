import mongoose, { Schema, Document } from 'mongoose';

export interface PriceTier {
  name: string;
  minPrice: number;
  maxPrice: number;
}

export interface ServiceRate {
  service: string;
  label: string;
  description: string;
  basePrice: number;
  multiplier: number;
  corridorMin: number;
  corridorMax: number;
  tiers: PriceTier[];
}

export interface IPricingConfig extends Document {
  version: number;
  effectiveFrom: Date;
  isActive: boolean;
  rates: ServiceRate[];
  createdAt: Date;
  updatedAt: Date;
}

const TierSchema = new Schema<PriceTier>(
  {
    name: { type: String, required: true },
    minPrice: { type: Number, required: true },
    maxPrice: { type: Number, required: true }
  },
  { _id: false }
);

const RateSchema = new Schema<ServiceRate>(
  {
    service: { type: String, required: true },
    label: { type: String, required: true },
    description: { type: String, required: true },
    basePrice: { type: Number, required: true },
    multiplier: { type: Number, default: 1, required: true },
    corridorMin: { type: Number, default: 0.7, required: true },
    corridorMax: { type: Number, default: 1.3, required: true },
    tiers: { type: [TierSchema], default: [] }
  },
  { _id: false }
);

const PricingConfigSchema = new Schema<IPricingConfig>(
  {
    version: { type: Number, default: 1, required: true },
    effectiveFrom: { type: Date, default: Date.now, required: true },
    isActive: { type: Boolean, default: true, required: true, index: true },
    rates: { type: [RateSchema], default: [] }
  },
  {
    timestamps: true
  }
);

export const PricingConfig = mongoose.model<IPricingConfig>('PricingConfig', PricingConfigSchema);
