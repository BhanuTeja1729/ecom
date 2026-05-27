import mongoose, { Schema, Document } from 'mongoose';

export interface IProductVariant {
  name: string;
  type: string;
  value: string;
  priceModifier: number;
  inventory: number;
  sku: string;
  sortOrder: number;
}

export interface IProductImage {
  url: string;
  altText: string;
  sortOrder: number;
  isPrimary: boolean;
}

export interface IProduct extends Document {
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  price: number;
  comparePrice?: number;
  costPrice?: number;
  sku: string;
  inventory: number;
  lowStockThreshold: number;
  category?: mongoose.Types.ObjectId;
  tags: string[];
  images: IProductImage[];
  variants: IProductVariant[];
  isFeatured: boolean;
  isActive: boolean;
  isDigital: boolean;
  weight?: number;
  dimensions?: { length: number; width: number; height: number };
  metaTitle?: string;
  metaDescription?: string;
  ratingAvg: number;
  ratingCount: number;
  soldCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProductImageSchema = new Schema<IProductImage>({
  url: { type: String, required: true },
  altText: String,
  sortOrder: { type: Number, default: 0 },
  isPrimary: { type: Boolean, default: false },
}, { _id: false });

const ProductVariantSchema = new Schema<IProductVariant>({
  name: { type: String, required: true },
  type: { type: String, required: true },
  value: { type: String, required: true },
  priceModifier: { type: Number, default: 0 },
  inventory: { type: Number, default: 0 },
  sku: String,
  sortOrder: { type: Number, default: 0 },
}, { _id: true });

const ProductSchema = new Schema<IProduct>({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  description: { type: String, required: true },
  shortDescription: String,
  price: { type: Number, required: true, min: 0 },
  comparePrice: { type: Number, min: 0 },
  costPrice: { type: Number, min: 0 },
  sku: { type: String, unique: true, sparse: true },
  inventory: { type: Number, default: 0, min: 0 },
  lowStockThreshold: { type: Number, default: 5 },
  category: { type: Schema.Types.ObjectId, ref: 'Category' },
  tags: [String],
  images: [ProductImageSchema],
  variants: [ProductVariantSchema],
  isFeatured: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  isDigital: { type: Boolean, default: false },
  weight: Number,
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
  },
  metaTitle: String,
  metaDescription: String,
  ratingAvg: { type: Number, default: 0, min: 0, max: 5 },
  ratingCount: { type: Number, default: 0 },
  soldCount: { type: Number, default: 0 },
}, { timestamps: true });

ProductSchema.index({ slug: 1 });
ProductSchema.index({ category: 1 });
ProductSchema.index({ price: 1 });
ProductSchema.index({ isFeatured: 1 });
ProductSchema.index({ isActive: 1 });
ProductSchema.index({ name: 'text', description: 'text', tags: 'text' });

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
