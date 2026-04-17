import mongoose, { Document, Schema } from 'mongoose';

export interface IFarm extends Document {
  farmer: mongoose.Types.ObjectId;
  name: string;
  district: string;
  state: string;
  land_size_acres: number;
  soil_type: string;
  irrigation_type: string;
  primary_crops: string;
  latitude: number;
  longitude: number;
  nitrogen_value: number;
  phosphorus_value: number;
  potassium_value: number;
  soil_ph: number;
  created_at: Date;
  updated_at: Date;
  id?: string;
}

const farmSchema: Schema = new Schema<IFarm>(
  {
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Farmer',
      required: [true, 'Farmer is required'],
    },
    name: {
      type: String,
      required: [true, 'Farm name is required'],
      trim: true,
    },
    district: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    land_size_acres: {
      type: Number,
      required: [true, 'Land size is required'],
    },
    soil_type: {
      type: String,
      default: 'loamy',
    },
    irrigation_type: {
      type: String,
      default: 'rain_fed',
    },
    primary_crops: {
      type: String,
      default: '',
    },
    latitude: {
      type: Number,
    },
    longitude: {
      type: Number,
    },
    nitrogen_value: {
      type: Number,
      min: 0,
      max: 140,
    },
    phosphorus_value: {
      type: Number,
      min: 0,
      max: 145,
    },
    potassium_value: {
      type: Number,
      min: 0,
      max: 205,
    },
    soil_ph: {
      type: Number,
      min: 0,
      max: 14,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

farmSchema.virtual('id').get(function (this: any) { return this._id.toHexString(); });
farmSchema.set('toJSON', { virtuals: true });
farmSchema.set('toObject', { virtuals: true });

export default mongoose.model<IFarm>('Farm', farmSchema);
