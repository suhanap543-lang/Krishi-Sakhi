import mongoose, { Document, Schema } from 'mongoose';

export interface IActivity extends Document {
  farmer: mongoose.Types.ObjectId;
  farm: mongoose.Types.ObjectId;
  activity_type: string;
  text_note: string;
  date: Date;
  amount?: string;
  created_at: Date;
  updated_at: Date;
  id?: string;
}

const activitySchema: Schema = new Schema<IActivity>(
  {
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Farmer',
      required: [true, 'Farmer is required'],
    },
    farm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Farm',
      required: [true, 'Farm is required'],
    },
    activity_type: {
      type: String,
      required: [true, 'Activity type is required'],
      enum: ['sowing', 'irrigation', 'fertilizer', 'pesticide', 'weeding', 'harvesting', 'pest_issue', 'disease_issue', 'other'],
      default: 'other',
    },
    text_note: {
      type: String,
      default: '',
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      default: Date.now,
    },
    amount: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

activitySchema.virtual('id').get(function (this: any) { return this._id.toHexString(); });
activitySchema.set('toJSON', { virtuals: true });
activitySchema.set('toObject', { virtuals: true });

export default mongoose.model<IActivity>('Activity', activitySchema);
