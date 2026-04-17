import mongoose, { Document, Schema } from 'mongoose';

export interface IFarmer extends Document {
  name: string;
  phone: string;
  email: string;
  state: string;
  district: string;
  preferred_language: string;
  experience_years: number;
  created_at: Date;
  updated_at: Date;
  id?: string;
}

const farmerSchema: Schema = new Schema<IFarmer>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      default: '',
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
    },
    district: {
      type: String,
      required: [true, 'District is required'],
      trim: true,
    },
    preferred_language: {
      type: String,
      default: 'English',
    },
    experience_years: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Virtual 'id' that returns _id as a string (to match frontend expectations)
farmerSchema.virtual('id').get(function (this: any) { return this._id.toHexString(); });
farmerSchema.set('toJSON', { virtuals: true });
farmerSchema.set('toObject', { virtuals: true });

export default mongoose.model<IFarmer>('Farmer', farmerSchema);
