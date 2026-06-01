import mongoose, { Schema, Document } from 'mongoose';

export interface IMedia extends Document {
  url: string;
  publicId: string;
  folder: string;
  fileName: string;
  resourceType: string;
  format?: string;
  size?: number;
  width?: number;
  height?: number;
  associatedType?: 'category' | 'product';
  associatedId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MediaSchema = new Schema<IMedia>({
  url: { type: String, required: true },
  publicId: { type: String, required: true, unique: true },
  folder: { type: String, required: true },
  fileName: { type: String, required: true },
  resourceType: { type: String, default: 'image' },
  format: String,
  size: Number,
  width: Number,
  height: Number,
  associatedType: { type: String, enum: ['category', 'product'] },
  associatedId: { type: Schema.Types.ObjectId, refPath: 'associatedType' },
}, { timestamps: true });

MediaSchema.index({ associatedType: 1, associatedId: 1 });

export const Media = mongoose.model<IMedia>('Media', MediaSchema);
