import mongoose, { Schema, Document } from 'mongoose';

export interface IProposal extends Document {
  leadId: mongoose.Types.ObjectId;
  proposalNumber: string;
  version: number;
  title: string;
  features: string[];
  deliverables: string[];
  timeline: string;
  estimatedCost: number;
  paymentMilestones: { description: string; amount: number }[];
  pdfUrl?: string;
  generatedBy?: mongoose.Types.ObjectId;
  status: 'DRAFT' | 'GENERATED' | 'SENT' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  createdAt: Date;
  updatedAt: Date;
}

const ProposalSchema = new Schema<IProposal>(
  {
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    proposalNumber: { type: String, required: true, unique: true, index: true },
    version: { type: Number, default: 1, required: true },
    title: { type: String, required: true },
    features: [{ type: String }],
    deliverables: [{ type: String }],
    timeline: { type: String, required: true },
    estimatedCost: { type: Number, required: true },
    paymentMilestones: [
      {
        description: { type: String, required: true },
        amount: { type: Number, required: true }
      }
    ],
    pdfUrl: { type: String },
    generatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['DRAFT', 'GENERATED', 'SENT', 'APPROVED', 'REJECTED', 'EXPIRED'],
      default: 'DRAFT',
      required: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

export const Proposal = mongoose.model<IProposal>('Proposal', ProposalSchema);
