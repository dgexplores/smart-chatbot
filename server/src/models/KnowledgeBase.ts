import mongoose, { Schema, Document } from 'mongoose';

export interface IKnowledgeBase extends Document {
  title: string;
  category:
    | 'PRICING'
    | 'FAQ'
    | 'SERVICES'
    | 'CASE_STUDIES'
    | 'PORTFOLIO'
    | 'TEAM'
    | 'POLICIES'
    | 'TECH_STACK';
  content: string;
  sourceDocumentId?: string;
  embeddingId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const KnowledgeBaseSchema = new Schema<IKnowledgeBase>(
  {
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: [
        'PRICING',
        'FAQ',
        'SERVICES',
        'CASE_STUDIES',
        'PORTFOLIO',
        'TEAM',
        'POLICIES',
        'TECH_STACK'
      ],
      required: true,
      index: true
    },
    content: { type: String, required: true },
    sourceDocumentId: { type: String },
    embeddingId: { type: String }
  },
  {
    timestamps: true
  }
);

export const KnowledgeBase = mongoose.model<IKnowledgeBase>('KnowledgeBase', KnowledgeBaseSchema);
