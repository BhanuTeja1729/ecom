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
    const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1 }).lean();
    res.json({ success: true, data: categories });
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
