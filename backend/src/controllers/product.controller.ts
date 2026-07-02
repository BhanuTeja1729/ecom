import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { Media } from '../models/Media';
import { User } from '../models/User';
import cloudinary from '../config/cloudinary';
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
    publicId: z.string().optional(),
    altText: z.string().optional(),
    sortOrder: z.number().default(0),
    isPrimary: z.boolean().default(false),
  })).default([]),
  variants: z.array(z.object({
    name: z.string(),
    type: z.string(),
    value: z.string(),
    priceModifier: z.number().default(0),
    comparePriceModifier: z.number().default(0),
    inventory: z.number().int().default(0),
    sku: z.string().optional(),
    sortOrder: z.number().default(0),
  })).default([]),
});

export async function getProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      page = '1', limit = '20', category, categorySlug, search, sort = 'createdAt',
      order = 'desc', minPrice, maxPrice, featured, tags, all,
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

    // all=true → return every matching product (admin use only, no pagination cap)
    if (all === 'true') {
      const [products, total] = await Promise.all([
        Product.find(query).populate('category', 'name slug').sort(sortObj).lean(),
        Product.countDocuments(query),
      ]);
      return res.json({
        success: true,
        data: products,
        pagination: { page: 1, limit: total, total, pages: 1 },
      });
    }

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

    // Link newly uploaded images to this product in the Media collection
    if (product.images && product.images.length > 0) {
      const urls = product.images.map(img => img.url);
      await Media.updateMany(
        { url: { $in: urls } },
        { $set: { associatedType: 'product', associatedId: product._id as mongoose.Types.ObjectId } }
      );
    }

    res.status(201).json({ success: true, data: product });
  } catch (err) { next(err); }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const data = productSchema.partial().parse(req.body);
    const product = await Product.findById(req.params.id);
    if (!product) throw createError('Product not found', 404);

    Object.assign(product, data);
    await product.save();

    // Link newly uploaded images and remove associations for unlinked images
    if (product.images) {
      const urls = product.images.map(img => img.url);
      await Media.updateMany(
        { url: { $in: urls } },
        { $set: { associatedType: 'product', associatedId: product._id as mongoose.Types.ObjectId } }
      );
      await Media.updateMany(
        { associatedType: 'product', associatedId: product._id, url: { $nin: urls } },
        { $unset: { associatedType: '', associatedId: '' } }
      );
    }

    res.json({ success: true, data: product });
  } catch (err) { next(err); }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) throw createError('Product not found', 404);

    // Find and delete associated assets from Cloudinary and Media collection
    const associatedMedia = await Media.find({ associatedType: 'product', associatedId: product._id });
    for (const media of associatedMedia) {
      try {
        await cloudinary.uploader.destroy(media.publicId);
      } catch (e) {
        console.error(`Failed to delete Cloudinary asset ${media.publicId}:`, e);
      }
    }
    await Media.deleteMany({ associatedType: 'product', associatedId: product._id });

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

export async function getPublicStats(req: Request, res: Response, next: NextFunction) {
  try {
    const [productCount, customerCount] = await Promise.all([
      Product.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'customer' }),
    ]);
    res.json({
      success: true,
      data: {
        products: productCount,
        customers: customerCount,
      },
    });
  } catch (err) { next(err); }
}

const bulkInventorySchema = z.array(z.object({
  sku: z.string(),
  inventory: z.number().int().min(0),
  lowStockThreshold: z.number().int().min(0).optional(),
  price: z.number().min(0).optional(),
  comparePrice: z.number().min(0).optional(),
}));

export async function bulkUpdateInventory(req: Request, res: Response, next: NextFunction) {
  try {
    const updates = bulkInventorySchema.parse(req.body);
    const results = [];

    for (const update of updates) {
      const sku = update.sku.toUpperCase();
      let product = await Product.findOne({ sku });
      let isVariant = false;
      let variantIdx = -1;

      if (!product) {
        product = await Product.findOne({ 'variants.sku': sku });
        if (product) {
          isVariant = true;
          variantIdx = product.variants.findIndex(v => v.sku?.toUpperCase() === sku);
        }
      }

      if (!product) {
        results.push({ sku: update.sku, success: false, error: 'Product or variant not found with this SKU' });
        continue;
      }

      if (isVariant && variantIdx !== -1) {
        const variant = product.variants[variantIdx];
        variant.inventory = update.inventory;
        
        if (update.price !== undefined) {
          variant.priceModifier = update.price - product.price;
        }
        if (update.comparePrice !== undefined) {
          variant.comparePriceModifier = update.comparePrice - (product.comparePrice ?? product.price);
        }
      } else {
        product.inventory = update.inventory;
        
        if (update.lowStockThreshold !== undefined) {
          product.lowStockThreshold = update.lowStockThreshold;
        }
        if (update.price !== undefined) {
          product.price = update.price;
        }
        if (update.comparePrice !== undefined) {
          product.comparePrice = update.comparePrice;
        }
      }

      await product.save();
      results.push({ sku: update.sku, success: true });
    }

    res.json({ success: true, results });
  } catch (err) { next(err); }
}

export async function bulkUpdatePrices(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      throw createError('No file uploaded', 400);
    }

    const fileContent = req.file.buffer.toString('utf-8');
    const lines = fileContent.split(/\r?\n/).filter(line => line.trim().length > 0);
    
    if (lines.length < 2) {
      throw createError('CSV file is empty or missing data lines', 400);
    }

    const parseCsvLine = (line: string): string[] => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase());
    
    const skuIdx = headers.findIndex(h => h.includes('sku'));
    const priceIdx = headers.findIndex(h => h.includes('price') && !h.includes('compare') && !h.includes('mrp'));
    const mrpIdx = headers.findIndex(h => h.includes('mrp') || h.includes('compareprice') || h.includes('compare price') || h.includes('compare_price') || h.includes('original price'));

    if (skuIdx === -1) {
      throw createError('CSV must contain a "SKU" column', 400);
    }
    if (priceIdx === -1 && mrpIdx === -1) {
      throw createError('CSV must contain at least a "Price" (selling price) or "MRP" (compare price) column', 400);
    }

    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const values = parseCsvLine(lines[i]);
      if (values.length < headers.length) {
        continue; // Skip malformed lines
      }

      const sku = values[skuIdx]?.toUpperCase();
      if (!sku) {
        failCount++;
        results.push({ row: i + 1, success: false, error: 'SKU is empty' });
        continue;
      }

      let product = await Product.findOne({ sku });
      let isVariant = false;
      let variantIdx = -1;

      if (!product) {
        product = await Product.findOne({ 'variants.sku': sku });
        if (product) {
          isVariant = true;
          variantIdx = product.variants.findIndex(v => v.sku?.toUpperCase() === sku);
        }
      }

      if (!product) {
        failCount++;
        results.push({ sku, row: i + 1, success: false, error: 'Product or variant not found with this SKU' });
        continue;
      }

      const updateData: any = {};

      if (isVariant && variantIdx !== -1) {
        const variant = product.variants[variantIdx];
        if (priceIdx !== -1) {
          const priceVal = parseFloat(values[priceIdx]);
          if (!isNaN(priceVal)) {
            const modifier = priceVal - product.price;
            variant.priceModifier = modifier;
            updateData.priceModifier = modifier;
          }
        }
        if (mrpIdx !== -1) {
          const mrpVal = parseFloat(values[mrpIdx]);
          if (!isNaN(mrpVal)) {
            const compModifier = mrpVal - (product.comparePrice ?? product.price);
            variant.comparePriceModifier = compModifier;
            updateData.comparePriceModifier = compModifier;
          }
        }
      } else {
        if (priceIdx !== -1) {
          const priceVal = parseFloat(values[priceIdx]);
          if (!isNaN(priceVal)) {
            product.price = priceVal;
            updateData.price = priceVal;
          }
        }
        if (mrpIdx !== -1) {
          const mrpVal = parseFloat(values[mrpIdx]);
          if (!isNaN(mrpVal)) {
            product.comparePrice = mrpVal;
            updateData.comparePrice = mrpVal;
          }
        }
      }

      if (Object.keys(updateData).length === 0) {
        failCount++;
        results.push({ sku, row: i + 1, success: false, error: 'No valid price/MRP numeric values to update' });
        continue;
      }

      await product.save();
      successCount++;
      results.push({ sku, row: i + 1, success: true, updated: updateData });
    }

    res.json({
      success: true,
      message: `Bulk price update complete. Success: ${successCount}, Failed: ${failCount}`,
      summary: { success: successCount, failed: failCount },
      results
    });
  } catch (err) { next(err); }
}
