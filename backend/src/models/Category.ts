import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  parent?: mongoose.Types.ObjectId;
  sortOrder: number;
  isActive: boolean;
  skuPrefix?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  description: String,
  imageUrl: String,
  parent: { type: Schema.Types.ObjectId, ref: 'Category' },
  sortOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  skuPrefix: { type: String, unique: true, sparse: true, uppercase: true, minlength: 3, maxlength: 3 },
}, { timestamps: true });

CategorySchema.index({ parent: 1 });

export const Category = mongoose.model<ICategory>('Category', CategorySchema);
