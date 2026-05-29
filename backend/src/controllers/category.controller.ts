import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Category } from '../models/Category';
import { createError } from '../middleware/error';
import { slugify } from '../utils/helpers';

const categorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  parent: z.string().optional(),
  sortOrder: z.number().default(0),
  isActive: z.boolean().default(true),
});

export async function getCategories(req: Request, res: Response, next: NextFunction) {
  try {
    const Product = (await import('../models/Product')).Product;

    // 3 parallel queries instead of N+1 sequential ones
    const [topLevel, allChildren, productCounts] = await Promise.all([
      // 1. Top-level categories (no parent)
      Category.find({
        isActive: true,
        $or: [{ parent: { $exists: false } }, { parent: null }],
      }).sort({ sortOrder: 1 }).lean(),

      // 2. All child categories (to map parent → children)
      Category.find({ parent: { $ne: null }, isActive: true }).select('_id parent').lean(),

      // 3. Product counts grouped by category in one aggregation
      Product.aggregate([
        { $match: { isActive: true, category: { $exists: true, $ne: null } } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
    ]);

    // Build lookup: parentId → [childIds]
    const childrenMap = new Map<string, string[]>();
    for (const child of allChildren) {
      const parentKey = String(child.parent);
      if (!childrenMap.has(parentKey)) childrenMap.set(parentKey, []);
      childrenMap.get(parentKey)!.push(String(child._id));
    }

    // Build lookup: categoryId → productCount
    const countMap = new Map<string, number>();
    for (const pc of productCounts) {
      countMap.set(String(pc._id), pc.count);
    }

    // Enrich top-level categories with counts (parent + children)
    const enriched = [];
    for (const cat of topLevel) {
      const catId = String(cat._id);
      let total = countMap.get(catId) || 0;
      const childIds = childrenMap.get(catId) || [];
      for (const cid of childIds) {
        total += countMap.get(cid) || 0;
      }
      if (total > 0) {
        enriched.push({ ...cat, productCount: total });
      }
    }

    res.json({ success: true, data: enriched });
  } catch (err) { next(err); }
}

export async function getCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const category = await Category.findOne({ slug: req.params.slug }).lean();
    if (!category) throw createError('Category not found', 404);
    res.json({ success: true, data: category });
  } catch (err) { next(err); }
}

export async function createCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const data = categorySchema.parse(req.body);
    const slug = slugify(data.name);
    const category = await Category.create({ ...data, slug });
    res.status(201).json({ success: true, data: category });
  } catch (err) { next(err); }
}

export async function updateCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const data = categorySchema.partial().parse(req.body);
    const category = await Category.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!category) throw createError('Category not found', 404);
    res.json({ success: true, data: category });
  } catch (err) { next(err); }
}

export async function deleteCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) throw createError('Category not found', 404);
    res.json({ success: true, message: 'Category deleted' });
  } catch (err) { next(err); }
}
