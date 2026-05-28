import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { createError } from '../middleware/error';
import { slugify } from '../utils/helpers';

const productSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().min(1),
  shortDescription: z.string().optional(),
  price: z.number().min(0),
  comparePrice: z.number().min(0).optional(),
  costPrice: z.number().min(0).optional(),
  sku: z.string().optional(),
  inventory: z.number().int().min(0).default(0),
  lowStockThreshold: z.number().int().min(0).default(5),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  isDigital: z.boolean().default(false),
  weight: z.number().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  images: z.array(z.object({
    url: z.string(),
    altText: z.string().optional(),
    sortOrder: z.number().default(0),
    isPrimary: z.boolean().default(false),
  })).default([]),
  variants: z.array(z.object({
    name: z.string(),
    type: z.string(),
    value: z.string(),
    priceModifier: z.number().default(0),
    inventory: z.number().int().default(0),
    sku: z.string().optional(),
    sortOrder: z.number().default(0),
  })).default([]),
});

export async function getProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      page = '1', limit = '20', category, categorySlug, search, sort = 'createdAt',
      order = 'desc', minPrice, maxPrice, featured, tags,
    } = req.query as Record<string, string>;

    const query: any = { isActive: true };

    // Resolve category by slug or ObjectId (including child categories)
    if (categorySlug) {
      const cat = await Category.findOne({ slug: categorySlug, isActive: true }).lean();
      if (cat) {
        // Also include child categories
        const childCats = await Category.find({ parent: cat._id, isActive: true }).select('_id').lean();
        const catIds = [cat._id, ...childCats.map(c => c._id)];
        query.category = { $in: catIds };
      } else {
        // No matching category → return empty results
        return res.json({ success: true, data: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } });
      }
    } else if (category) {
      // Could be an ObjectId or a slug
      if (mongoose.isValidObjectId(category)) {
        // Also include child categories
        const childCats = await Category.find({ parent: category, isActive: true }).select('_id').lean();
        const catIds = [new mongoose.Types.ObjectId(category), ...childCats.map(c => c._id)];
        query.category = { $in: catIds };
      } else {
        // Treat as slug
        const cat = await Category.findOne({ slug: category, isActive: true }).lean();
        if (cat) {
          const childCats = await Category.find({ parent: cat._id, isActive: true }).select('_id').lean();
          const catIds = [cat._id, ...childCats.map(c => c._id)];
          query.category = { $in: catIds };
        } else {
          return res.json({ success: true, data: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } });
        }
      }
    }

    if (featured === 'true') query.isFeatured = true;
    if (tags) query.tags = { $in: tags.split(',') };
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }
    if (search) {
      // Support partial name matching in addition to full-text search
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { shortDescription: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    const sortDir = order === 'asc' ? 1 : -1;
    const sortObj: any = { [sort]: sortDir };

    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 200);
    const skip = (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      Product.find(query).populate('category', 'name slug').sort(sortObj).skip(skip).limit(limitNum).lean(),
      Product.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: products,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (err) { next(err); }
}

export async function getProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await Product.findOne({ slug: req.params.slug, isActive: true })
      .populate('category', 'name slug').lean();
    if (!product) throw createError('Product not found', 404);
    res.json({ success: true, data: product });
  } catch (err) { next(err); }
}

export async function createProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const data = productSchema.parse(req.body);
    const slug = slugify(data.name) + '-' + Date.now();
    const product = await Product.create({ ...data, slug });
    res.status(201).json({ success: true, data: product });
  } catch (err) { next(err); }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const data = productSchema.partial().parse(req.body);
    const product = await Product.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!product) throw createError('Product not found', 404);
    res.json({ success: true, data: product });
  } catch (err) { next(err); }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) throw createError('Product not found', 404);
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) { next(err); }
}

export async function getFeaturedProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const products = await Product.find({ isFeatured: true, isActive: true })
      .populate('category', 'name slug').limit(12).lean();
    res.json({ success: true, data: products });
  } catch (err) { next(err); }
}

const inventorySchema = z.object({
  inventory: z.number().int().min(0),
  lowStockThreshold: z.number().int().min(0).optional(),
});

export async function updateInventory(req: Request, res: Response, next: NextFunction) {
  try {
    const { inventory, lowStockThreshold } = inventorySchema.parse(req.body);
    const update: Record<string, number> = { inventory };
    if (lowStockThreshold !== undefined) update.lowStockThreshold = lowStockThreshold;

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, runValidators: true }
    ).populate('category', 'name slug');
    if (!product) throw createError('Product not found', 404);
    res.json({ success: true, data: product });
  } catch (err) { next(err); }
}
