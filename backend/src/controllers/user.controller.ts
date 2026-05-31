import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { User } from '../models/User';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { createError } from '../middleware/error';

export async function getProfile(req: Request & { user?: any }, res: Response, next: NextFunction) {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) throw createError('User not found', 404);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
}

const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().optional(),
  shippingAddress: z.object({
    fullName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    addressLine1: z.string().optional(),
    addressLine2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
});

export async function updateProfile(req: Request & { user?: any }, res: Response, next: NextFunction) {
  try {
    const data = updateProfileSchema.parse(req.body);
    const user = await User.findByIdAndUpdate(req.user.id, data, { new: true }).lean();
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
}

export async function getWishlist(req: Request & { user?: any }, res: Response, next: NextFunction) {
  try {
    const user = await User.findById(req.user.id).populate('wishlist', 'name slug price images ratingAvg').lean();
    if (!user) throw createError('User not found', 404);
    res.json({ success: true, data: user.wishlist });
  } catch (err) { next(err); }
}

export async function toggleWishlist(req: Request & { user?: any }, res: Response, next: NextFunction) {
  try {
    const { productId } = z.object({ productId: z.string() }).parse(req.body);
    const user = await User.findById(req.user.id);
    if (!user) throw createError('User not found', 404);

    const idx = user.wishlist.findIndex((id) => id.toString() === productId);
    let action: string;
    if (idx > -1) {
      user.wishlist.splice(idx, 1);
      action = 'removed';
    } else {
      user.wishlist.push(productId as any);
      action = 'added';
    }
    await user.save();
    res.json({ success: true, data: { action, wishlist: user.wishlist } });
  } catch (err) { next(err); }
}

// Admin controllers
export async function getAdminStats(req: Request, res: Response, next: NextFunction) {
  try {
    const [totalOrders, totalRevenue, totalProducts, totalUsers] = await Promise.all([
      Order.countDocuments(),
      Order.aggregate([{ $match: { paymentStatus: 'paid' } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      Product.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'customer' }),
    ]);

    const recentOrders = await Order.find().sort({ createdAt: -1 }).limit(5).populate('user', 'fullName email').lean();

    const monthlySales = await Order.aggregate([
      { $match: { paymentStatus: 'paid', createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } } },
      { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    res.json({
      success: true,
      data: {
        totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        totalProducts,
        totalUsers,
        recentOrders,
        monthlySales,
      },
    });
  } catch (err) { next(err); }
}

export async function getAllUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const { page = '1', limit = '20' } = req.query as Record<string, string>;
    const pageNum = parseInt(page), limitNum = parseInt(limit);
    const [users, total] = await Promise.all([
      User.find().sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum).lean(),
      User.countDocuments(),
    ]);
    res.json({ success: true, data: users, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } });
  } catch (err) { next(err); }
}

// ─── Address CRUD ────────────────────────────────────────────────────────────

export async function getAddresses(req: Request & { user?: any }, res: Response, next: NextFunction) {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) throw createError('User not found', 404);
    res.json({ success: true, data: user.addresses || [] });
  } catch (err) { next(err); }
}

const addressBodySchema = z.object({
  label: z.string().optional(),
  fullName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  doorNo: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  landmark: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
});

export async function addAddress(req: Request & { user?: any }, res: Response, next: NextFunction) {
  try {
    const data = addressBodySchema.parse(req.body);
    const user = await User.findById(req.user.id);
    if (!user) throw createError('User not found', 404);
    user.addresses.push(data as any);
    await user.save();
    res.status(201).json({ success: true, data: user.addresses });
  } catch (err) { next(err); }
}

export async function updateAddress(req: Request & { user?: any }, res: Response, next: NextFunction) {
  try {
    const data = addressBodySchema.parse(req.body);
    const user = await User.findById(req.user.id);
    if (!user) throw createError('User not found', 404);
    const addr = (user.addresses as any).id(req.params.addressId);
    if (!addr) throw createError('Address not found', 404);
    Object.assign(addr, data);
    await user.save();
    res.json({ success: true, data: user.addresses });
  } catch (err) { next(err); }
}

export async function deleteAddress(req: Request & { user?: any }, res: Response, next: NextFunction) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) throw createError('User not found', 404);
    const addr = (user.addresses as any).id(req.params.addressId);
    if (!addr) throw createError('Address not found', 404);
    addr.deleteOne();
    await user.save();
    res.json({ success: true, data: user.addresses });
  } catch (err) { next(err); }
}
