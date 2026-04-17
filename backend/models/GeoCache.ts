import mongoose, { Document, Schema } from 'mongoose';

export interface IGeoCache extends Document {
  district?: string;
  state?: string;
  lat?: number;
  lon?: number;
  key?: string;
  data?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

const geoCacheSchema: Schema = new Schema<IGeoCache>(
  {
    district: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    lat: {
      type: Number,
    },
    lon: {
      type: Number,
    },
    key: {
      type: String,
      index: true,
    },
    data: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index so lookups by (district, state) are fast
geoCacheSchema.index({ district: 1, state: 1 }, { unique: true });

geoCacheSchema.virtual('id').get(function (this: any) { return this._id.toHexString(); });
geoCacheSchema.set('toJSON', { virtuals: true });
geoCacheSchema.set('toObject', { virtuals: true });

export default mongoose.model<IGeoCache>('GeoCache', geoCacheSchema);
