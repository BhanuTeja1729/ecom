import mongoose, { Schema, Document } from 'mongoose';

export interface ICoupon extends Document {
  code: string;
  description?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minimumOrderAmount: number;
  maximumDiscountAmount?: number;
  usageLimit?: number;
  usageCount: number;
  isActive: boolean;
  expiresAt?: Date;
  usedBy: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const CouponSchema = new Schema<ICoupon>({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  description: String,
  discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
  discountValue: { type: Number, required: true, min: 0 },
  minimumOrderAmount: { type: Number, default: 0 },
  maximumDiscountAmount: Number,
  usageLimit: Number,
  usageCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  expiresAt: Date,
  usedBy: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
}, { timestamps: true });


export const Coupon = mongoose.model<ICoupon>('Coupon', CouponSchema);
