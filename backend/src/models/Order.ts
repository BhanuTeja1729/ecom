import mongoose, { Schema, Document } from 'mongoose';
import type { IAddress } from './User';

export interface IOrderItem {
  product: mongoose.Types.ObjectId;
  variantId?: string;
  productName: string;
  variantName?: string;
  price: number;
  quantity: number;
  total: number;
  image?: string;
}

export interface IStatusEvent {
  status: string;
  message?: string;
  timestamp: Date;
}

export interface IOrder extends Document {
  orderNumber: string;
  user?: mongoose.Types.ObjectId;
  guestEmail?: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  items: IOrderItem[];
  subtotal: number;
  discountAmount: number;
  shippingAmount: number;
  taxAmount: number;
  total: number;
  couponCode?: string;
  shippingAddress: IAddress;
  billingAddress?: IAddress;
  paymentMethod?: string;
  paymentIntentId?: string;
  notes?: string;
  trackingNumber?: string;
  statusHistory: IStatusEvent[];
  shippedAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AddressSchema = new Schema<IAddress>({
  fullName: String, email: String, phone: String,
  addressLine1: String, addressLine2: String,
  city: String, state: String, postalCode: String, country: String,
}, { _id: false });

const OrderItemSchema = new Schema<IOrderItem>({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  variantId: String,
  productName: { type: String, required: true },
  variantName: String,
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  total: { type: Number, required: true },
  image: String,
}, { _id: false });

const OrderSchema = new Schema<IOrder>({
  orderNumber: { type: String, required: true, unique: true },
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  guestEmail: String,
  status: { type: String, enum: ['pending','confirmed','processing','shipped','delivered','cancelled','refunded'], default: 'pending' },
  paymentStatus: { type: String, enum: ['pending','paid','failed','refunded'], default: 'pending' },
  items: [OrderItemSchema],
  subtotal: { type: Number, required: true },
  discountAmount: { type: Number, default: 0 },
  shippingAmount: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  total: { type: Number, required: true },
  couponCode: String,
  shippingAddress: { type: AddressSchema, required: true },
  billingAddress: AddressSchema,
  paymentMethod: String,
  paymentIntentId: String,
  notes: String,
  trackingNumber: String,
  statusHistory: [{ status: String, message: String, timestamp: { type: Date, default: Date.now } }],
  shippedAt: Date,
  deliveredAt: Date,
}, { timestamps: true });

OrderSchema.index({ user: 1 });
OrderSchema.index({ orderNumber: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ createdAt: -1 });

export const Order = mongoose.model<IOrder>('Order', OrderSchema);
