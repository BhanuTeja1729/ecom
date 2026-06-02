import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IAddress {
  _id?: string;
  label?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  doorNo?: string;
  addressLine1?: string;
  addressLine2?: string;
  landmark?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export interface IUser extends Document {
  email: string;
  password?: string;
  fullName: string;
  avatarUrl?: string;
  phone?: string;
  role: 'customer' | 'delivery_partner' | 'admin';
  googleId?: string;
  auth0Id?: string;
  isVerified: boolean;
  isActive: boolean;
  shippingAddress?: IAddress;
  addresses: IAddress[];
  wishlist: mongoose.Types.ObjectId[];
  refreshTokens: string[];
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const AddressSchema = new Schema<IAddress>({
  label: String,
  fullName: String,
  email: String,
  phone: String,
  doorNo: String,
  addressLine1: String,
  addressLine2: String,
  landmark: String,
  city: String,
  state: String,
  postalCode: String,
  country: String,
  latitude: Number,
  longitude: Number,
}, { _id: true });

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, select: false },
  fullName: { type: String, required: true, trim: true },
  avatarUrl: String,
  phone: String,
  role: { type: String, enum: ['customer', 'delivery_partner', 'admin'], default: 'customer' },
  googleId: { type: String, sparse: true },
  auth0Id: { type: String, sparse: true },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  shippingAddress: AddressSchema,
  addresses: [AddressSchema],
  wishlist: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
  refreshTokens: [String],
  resetPasswordToken: String,
  resetPasswordExpires: Date,
}, { timestamps: true });

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};


export const User = mongoose.model<IUser>('User', UserSchema);
