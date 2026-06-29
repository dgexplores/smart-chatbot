import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  userId?: mongoose.Types.ObjectId;
  leadId?: mongoose.Types.ObjectId;
  type: string;
  title: string;
  message: string;
  channel: 'EMAIL' | 'DASHBOARD' | 'SYSTEM';
  isRead: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', index: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    channel: {
      type: String,
      enum: ['EMAIL', 'DASHBOARD', 'SYSTEM'],
      default: 'DASHBOARD',
      required: true
    },
    isRead: { type: Boolean, default: false, required: true, index: true }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
