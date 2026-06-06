import mongoose, { Schema, Document } from 'mongoose';

export interface ISetting extends Document {
  key: string;
  value: any;
  createdAt: Date;
  updatedAt: Date;
}

const SettingSchema = new Schema<ISetting>({
  key: { type: String, required: true, unique: true },
  value: { type: Schema.Types.Mixed, required: true },
}, { timestamps: true });

export const Setting = mongoose.model<ISetting>('Setting', SettingSchema);

export async function getSettingValue(key: string, defaultValue: any): Promise<any> {
  try {
    const setting = await Setting.findOne({ key }).lean();
    return setting ? setting.value : defaultValue;
  } catch {
    return defaultValue;
  }
}
