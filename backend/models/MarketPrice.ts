import mongoose, { Document, Schema } from 'mongoose';

export interface IMarketPrice extends Document {
  state: string;
  district?: string;
  market: string;
  commodity: string;
  variety?: string;
  grade?: string;
  min_price?: number;
  max_price?: number;
  modal_price?: number;
  arrival_date?: Date;
  fetched_at?: Date;
  scraped?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  id?: string;
}

const marketPriceSchema: Schema = new Schema<IMarketPrice>({
  state:        { type: String, required: true, index: true },
  district:     { type: String, index: true },
  market:       { type: String, required: true },
  commodity:    { type: String, required: true, index: true },
  variety:      { type: String, default: 'Other' },
  grade:        { type: String, default: 'FAQ' },
  min_price:    { type: Number, default: 0 },
  max_price:    { type: Number, default: 0 },
  modal_price:  { type: Number, default: 0 },
  arrival_date: { type: Date },
  fetched_at:   { type: Date, default: Date.now },
  scraped:      { type: Boolean, default: false }
}, { timestamps: true });

marketPriceSchema.index({ state: 1, commodity: 1, arrival_date: -1 });
marketPriceSchema.virtual('id').get(function (this: any) { return this._id.toHexString(); });
marketPriceSchema.set('toJSON', { virtuals: true });
marketPriceSchema.set('toObject', { virtuals: true });

export default mongoose.model<IMarketPrice>('MarketPrice', marketPriceSchema);
