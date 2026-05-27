import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Review } from '../models/Review';
import { Product } from '../models/Product';
import { createError } from '../middleware/error';

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional(),
  body: z.string().min(10).max(2000),
});

export async function getReviews(req: Request, res: Response, next: NextFunction) {
  try {
    const { productId } = req.params;
    const { page = '1', limit = '10' } = req.query as Record<string, string>;
    const pageNum = parseInt(page), limitNum = parseInt(limit);
    const [reviews, total] = await Promise.all([
      Review.find({ product: productId, isApproved: true })
        .populate('user', 'fullName avatarUrl')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Review.countDocuments({ product: productId, isApproved: true }),
    ]);
    res.json({ success: true, data: reviews, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } });
  } catch (err) { next(err); }
}

export async function createReview(req: Request & { user?: any }, res: Response, next: NextFunction) {
  try {
    const { productId } = req.params;
    const data = reviewSchema.parse(req.body);

    const existing = await Review.findOne({ product: productId, user: req.user.id });
    if (existing) throw createError('You have already reviewed this product', 409);

    const review = await Review.create({ ...data, product: productId, user: req.user.id });

    // Update product rating
    const stats = await Review.aggregate([
      { $match: { product: review.product, isApproved: true } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    if (stats.length > 0) {
      await Product.findByIdAndUpdate(productId, {
        ratingAvg: Math.round(stats[0].avg * 10) / 10,
        ratingCount: stats[0].count,
      });
    }

    res.status(201).json({ success: true, data: review });
  } catch (err) { next(err); }
}

export async function deleteReview(req: Request & { user?: any }, res: Response, next: NextFunction) {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) throw createError('Review not found', 404);
    if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
      throw createError('Unauthorized', 403);
    }
    await review.deleteOne();
    res.json({ success: true, message: 'Review deleted' });
  } catch (err) { next(err); }
}
