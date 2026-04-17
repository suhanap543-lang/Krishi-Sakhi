import mongoose, { Document, Schema } from 'mongoose';

export interface IScheme extends Document {
  name: string;
  category: string;
  state?: string;
  department?: string;
  description?: string;
  highlights: string[];
  eligibility?: string;
  benefits?: string;
  official_url?: string;
  launch_year?: string;
  status: string;
  tags: string[];
  createdAt?: Date;
  updatedAt?: Date;
  id?: string;
}

const schemeSchema: Schema = new Schema<IScheme>({
  name:          { type: String, required: true },
  category:      { type: String, enum: ['national', 'state'], default: 'national' },
  state:         { type: String, default: 'All India', index: true },
  department:    { type: String, default: 'Ministry of Agriculture & Farmers Welfare' },
  description:   { type: String, default: '' },
  highlights:    [{ type: String }],
  eligibility:   { type: String, default: '' },
  benefits:      { type: String, default: '' },
  official_url:  { type: String, default: '' },
  launch_year:   { type: String, default: '' },
  status:        { type: String, enum: ['active', 'closed', 'upcoming'], default: 'active' },
  tags:          [{ type: String }]
}, { timestamps: true });

schemeSchema.virtual('id').get(function (this: any) { return this._id.toHexString(); });
schemeSchema.set('toJSON', { virtuals: true });
schemeSchema.set('toObject', { virtuals: true });

export default mongoose.model<IScheme>('Scheme', schemeSchema);
