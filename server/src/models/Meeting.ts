import mongoose, { Schema, Document } from 'mongoose';

export interface IMeeting extends Document {
  leadId: mongoose.Types.ObjectId;
  executiveId?: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  meetingDate: Date;
  duration: number; // in minutes
  meetLink?: string;
  calendarEventId?: string;
  status: 'REQUESTED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  createdAt: Date;
  updatedAt: Date;
}

const MeetingSchema = new Schema<IMeeting>(
  {
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    executiveId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    title: { type: String, required: true },
    description: { type: String },
    meetingDate: { type: Date, required: true, index: true },
    duration: { type: Number, default: 30, required: true },
    meetLink: { type: String },
    calendarEventId: { type: String },
    status: {
      type: String,
      enum: ['REQUESTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'],
      default: 'REQUESTED',
      required: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

export const Meeting = mongoose.model<IMeeting>('Meeting', MeetingSchema);
