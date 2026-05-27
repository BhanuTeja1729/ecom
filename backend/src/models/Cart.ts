import mongoose, { Schema, Document } from 'mongoose';

export interface ICartItem {
  product: mongoose.Types.ObjectId;
  variantId?: string;
  quantity: number;
  price: number;
  name: string;
  image?: string;
}

export interface ICart extends Document {
  user?: mongoose.Types.ObjectId;
  sessionId?: string;
  items: ICartItem[];
  couponCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CartItemSchema = new Schema<ICartItem>({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  variantId: String,
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true },
  name: { type: String, required: true },
  image: String,
}, { _id: false });

const CartSchema = new Schema<ICart>({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  sessionId: String,
  items: [CartItemSchema],
  couponCode: String,
}, { timestamps: true });

CartSchema.index({ user: 1 });
CartSchema.index({ sessionId: 1 });

export const Cart = mongoose.model<ICart>('Cart', CartSchema);
