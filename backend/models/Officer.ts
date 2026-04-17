import mongoose, { Document, Schema } from 'mongoose';

export interface IOfficer extends Document {
  name: string;
  designation: string;
  department?: string;
  specialization?: string;
  state: string;
  district: string;
  office_address?: string;
  phone?: string;
  email?: string;
  available_hours?: string;
  experience_years?: number;
  languages?: string;
  rating?: number;
  is_available?: boolean;
  consultation_fee?: string;
  photo_url?: string;
  createdAt?: Date;
  updatedAt?: Date;
  id?: string;
}

const officerSchema: Schema = new Schema<IOfficer>({
  name:              { type: String, required: true },
  designation:       { type: String, required: true },
  department:        { type: String, default: 'Department of Agriculture' },
  specialization:    { type: String, default: 'General Agriculture' },
  state:             { type: String, required: true, index: true },
  district:          { type: String, required: true, index: true },
  office_address:    { type: String, default: '' },
  phone:             { type: String, default: '' },
  email:             { type: String, default: '' },
  available_hours:   { type: String, default: '10:00 AM - 5:00 PM' },
  experience_years:  { type: Number, default: 5 },
  languages:         { type: String, default: 'Hindi, English' },
  rating:            { type: Number, default: 4.0, min: 1, max: 5 },
  is_available:      { type: Boolean, default: true },
  consultation_fee:  { type: String, default: 'Free' },
  photo_url:         { type: String, default: '' }
}, { timestamps: true });

officerSchema.virtual('id').get(function (this: any) { return this._id.toHexString(); });
officerSchema.set('toJSON', { virtuals: true });
officerSchema.set('toObject', { virtuals: true });

export default mongoose.model<IOfficer>('Officer', officerSchema);
