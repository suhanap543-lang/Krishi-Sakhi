import mongoose, { Document, Schema } from 'mongoose';

export interface ITransaction extends Document {
  farmer: mongoose.Types.ObjectId;
  type: string;
  commodity: string;
  variety?: string;
  market: string;
  state?: string;
  district?: string;
  quantity: number;
  unit?: string;
  price_per_unit: number;
  total_price: number;
  status: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
  id?: string;
}

const transactionSchema: Schema = new Schema<ITransaction>({
  farmer:         { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer', required: true },
  type:           { type: String, enum: ['buy', 'sell'], required: true },
  commodity:      { type: String, required: true },
  variety:        { type: String, default: 'Standard' },
  market:         { type: String, required: true },
  state:          { type: String },
  district:       { type: String },
  quantity:       { type: Number, required: true, min: 0.1 },
  unit:           { type: String, default: 'quintal' },
  price_per_unit: { type: Number, required: true },
  total_price:    { type: Number, required: true },
  status:         { type: String, enum: ['pending', 'completed', 'cancelled'], default: 'pending' },
  notes:          { type: String }
}, { timestamps: true });

transactionSchema.virtual('id').get(function (this: any) { return this._id.toHexString(); });
transactionSchema.set('toJSON', { virtuals: true });
transactionSchema.set('toObject', { virtuals: true });

export default mongoose.model<ITransaction>('Transaction', transactionSchema);
