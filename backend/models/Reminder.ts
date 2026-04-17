import mongoose, { Document, Schema } from 'mongoose';

export interface IReminder extends Document {
  farmer: mongoose.Types.ObjectId;
  farm: mongoose.Types.ObjectId;
  title: string;
  description: string;
  due_date: Date;
  category: string;
  priority: string;
  is_completed: boolean;
  created_at: Date;
  updated_at: Date;
  id?: string;
}

const reminderSchema: Schema = new Schema<IReminder>(
  {
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Farmer',
      required: [true, 'Farmer is required'],
    },
    farm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Farm',
      required: [true, 'Farm is required for a reminder'],
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    due_date: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    category: {
      type: String,
      enum: ['operation', 'scheme', 'price', 'weather', 'pest', 'general'],
      default: 'general',
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    is_completed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

reminderSchema.virtual('id').get(function (this: any) { return this._id.toHexString(); });
reminderSchema.set('toJSON', { virtuals: true });
reminderSchema.set('toObject', { virtuals: true });

export default mongoose.model<IReminder>('Reminder', reminderSchema);
