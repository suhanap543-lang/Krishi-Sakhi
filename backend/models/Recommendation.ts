import mongoose, { Document, Schema } from 'mongoose';

export interface IRecommendation extends Document {
  farmer: mongoose.Types.ObjectId;
  farm?: mongoose.Types.ObjectId;
  soilData: {
    N: number;
    P: number;
    K: number;
    ph: number;
  };
  weather: {
    temperature?: number;
    humidity?: number;
    rainfall?: number;
    location?: string;
  };
  recommendedCrop: string;
  confidence?: number;
  alternativeCrops: string[];
  explanation?: string;
  soilInsights?: string;
  growingTips: string[];
  warnings: string[];
  bestSowingTime?: string;
  estimatedYield?: string;
  createdAt?: Date;
  updatedAt?: Date;
  id?: string;
}

const RecommendationSchema: Schema = new Schema<IRecommendation>(
  {
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer' },
    farm: { type: mongoose.Schema.Types.ObjectId, ref: 'Farm', default: null },

    soilData: {
      N: { type: Number, required: true },
      P: { type: Number, required: true },
      K: { type: Number, required: true },
      ph: { type: Number, required: true },
    },

    weather: {
      temperature: Number,
      humidity: Number,
      rainfall: Number,
      location: String,
    },

    recommendedCrop: { type: String, required: true },
    confidence: { type: Number },
    alternativeCrops: [{ type: String }],

    // Gemini-generated fields
    explanation: { type: String },
    soilInsights: { type: String },
    growingTips: [{ type: String }],
    warnings: [{ type: String }],
    bestSowingTime: { type: String },
    estimatedYield: { type: String },
  },
  { timestamps: true }
);

RecommendationSchema.virtual('id').get(function (this: any) { return this._id.toHexString(); });
RecommendationSchema.set('toJSON', { virtuals: true });
RecommendationSchema.set('toObject', { virtuals: true });

export default mongoose.model<IRecommendation>('Recommendation', RecommendationSchema);
