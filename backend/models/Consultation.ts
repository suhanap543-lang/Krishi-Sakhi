import mongoose, { Document, Schema } from 'mongoose';

export interface IConsultation extends Document {
  farmer: mongoose.Types.ObjectId;
  officer: mongoose.Types.ObjectId;
  subject: string;
  description?: string;
  consultation_type: string;
  preferred_date: Date;
  preferred_time?: string;
  status: string;
  farmer_phone?: string;
  farmer_location?: string;
  notes?: string;
  room_id?: string;
  video_call_status?: string;
  createdAt?: Date;
  updatedAt?: Date;
  id?: string;
}

const consultationSchema: Schema = new Schema<IConsultation>({
  farmer:            { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer', required: true },
  officer:           { type: mongoose.Schema.Types.ObjectId, ref: 'Officer', required: true },
  subject:           { type: String, required: true },
  description:       { type: String, default: '' },
  consultation_type: { type: String, enum: ['phone', 'video', 'visit', 'office'], default: 'phone' },
  preferred_date:    { type: Date, required: true },
  preferred_time:    { type: String, default: '10:00 AM' },
  status:            { type: String, enum: ['pending', 'confirmed', 'completed', 'cancelled'], default: 'pending' },
  farmer_phone:      { type: String, default: '' },
  farmer_location:   { type: String, default: '' },
  notes:             { type: String, default: '' },
  room_id:           { type: String, default: '' },
  video_call_status: { type: String, enum: ['none', 'waiting', 'active', 'ended'], default: 'none' }
}, { timestamps: true });

consultationSchema.virtual('id').get(function (this: any) { return this._id.toHexString(); });
consultationSchema.set('toJSON', { virtuals: true });
consultationSchema.set('toObject', { virtuals: true });

export default mongoose.model<IConsultation>('Consultation', consultationSchema);
