import mongoose, { Schema, Document } from 'mongoose';

export interface IReview extends Document {
  product: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  rating: number;
  title?: string;
  body: string;
  isVerifiedPurchase: boolean;
  isApproved: boolean;
  helpfulCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: String,
  body: { type: String, required: true },
  isVerifiedPurchase: { type: Boolean, default: false },
  isApproved: { type: Boolean, default: true },
  helpfulCount: { type: Number, default: 0 },
}, { timestamps: true });

ReviewSchema.index({ product: 1 });
ReviewSchema.index({ user: 1, product: 1 }, { unique: true });

export const Review = mongoose.model<IReview>('Review', ReviewSchema);
