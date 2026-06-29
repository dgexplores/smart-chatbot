import mongoose, { Schema, Document } from 'mongoose';

export interface ILead extends Document {
  sessionId: string;
  customerName?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  industry?: string;
  projectType?: string;
  budget?: string;
  timeline?: string;
  leadScore: number;
  leadPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'HOT';
  requirementsSummary?: string;
  aiSummary?: string;
  status:
    | 'NEW'
    | 'QUALIFIED'
    | 'PROPOSAL_SENT'
    | 'MEETING_REQUESTED'
    | 'MEETING_SCHEDULED'
    | 'NEGOTIATION'
    | 'WON'
    | 'LOST'
    | 'DORMANT';
  executiveAssigned?: mongoose.Types.ObjectId;
  source: string;
  tags: string[];
  notes?: string;
  reminders?: { title: string; date: Date; completed: boolean }[];
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema = new Schema<ILead>(
  {
    sessionId: { type: String, required: true, index: true },
    customerName: { type: String, trim: true },
    companyName: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true, index: true },
    phone: { type: String, trim: true },
    industry: { type: String, trim: true },
    projectType: { type: String, trim: true },
    budget: { type: String, trim: true },
    timeline: { type: String, trim: true },
    leadScore: { type: Number, default: 0, required: true },
    leadPriority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'HOT'],
      default: 'LOW',
      required: true
    },
    requirementsSummary: { type: String },
    aiSummary: { type: String },
    status: {
      type: String,
      enum: [
        'NEW',
        'QUALIFIED',
        'PROPOSAL_SENT',
        'MEETING_REQUESTED',
        'MEETING_SCHEDULED',
        'NEGOTIATION',
        'WON',
        'LOST',
        'DORMANT'
      ],
      default: 'NEW',
      required: true,
      index: true
    },
    executiveAssigned: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    source: { type: String, default: 'website', required: true },
    tags: [{ type: String }],
    notes: { type: String, default: '' },
    reminders: [
      {
        title: { type: String, required: true },
        date: { type: Date, required: true },
        completed: { type: Boolean, default: false }
      }
    ],
    isDeleted: { type: Boolean, default: false, required: true }
  },
  {
    timestamps: true
  }
);

// Indexes
LeadSchema.index({ status: 1, leadPriority: 1 });

export const Lead = mongoose.model<ILead>('Lead', LeadSchema);
