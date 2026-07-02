import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Coupon } from '../models/Coupon';
import { createError } from '../middleware/error';

const couponCreateSchema = z.object({
  code: z.string().min(1).max(30).toUpperCase().trim(),
  description: z.string().optional(),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.number().min(0),
  minimumOrderAmount: z.number().min(0).optional().default(0),
  maximumDiscountAmount: z.number().min(0).optional(),
  usageLimit: z.number().int().min(1).optional(),
  expiresAt: z.string().optional().nullable(),
});

export async function getCoupons(req: Request, res: Response, next: NextFunction) {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: coupons });
  } catch (err) { next(err); }
}

export async function createCoupon(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = couponCreateSchema.parse(req.body);
    
    // Check if coupon code already exists
    const existing = await Coupon.findOne({ code: parsed.code });
    if (existing) throw createError('A coupon with this code already exists', 409);

    const couponData = {
      ...parsed,
      expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : undefined,
    };

    const coupon = await Coupon.create(couponData);
    res.status(201).json({ success: true, data: coupon });
  } catch (err) { next(err); }
}

export async function deleteCoupon(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findByIdAndDelete(id);
    if (!coupon) throw createError('Coupon not found', 404);
    res.json({ success: true, message: 'Coupon deleted successfully' });
  } catch (err) { next(err); }
}

export async function getAvailableCoupons(req: Request & { user?: any }, res: Response, next: NextFunction) {
  try {
    const query: any = {
      isActive: true,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    };

    if (req.user?.id) {
      query.usedBy = { $ne: req.user.id };
    }

    const coupons = await Coupon.find(query).sort({ createdAt: -1 }).lean();

    // Filter out coupons that have reached their usage limit in memory
    const available = coupons.filter(c => !c.usageLimit || c.usageCount < c.usageLimit);

    res.json({ success: true, data: available });
  } catch (err) { next(err); }
}
