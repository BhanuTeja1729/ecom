import mongoose, { Schema, Document } from 'mongoose';

export interface IProductVariant {
  name: string;
  type: string;
  value: string;
  priceModifier: number;
  inventory: number;
  sku: string;
  sortOrder: number;
}

export interface IProductImage {
  url: string;
  altText: string;
  sortOrder: number;
  isPrimary: boolean;
}

export interface IProduct extends Document {
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  price: number;
  comparePrice?: number;
  costPrice?: number;
  sku: string;
  inventory: number;
  lowStockThreshold: number;
  category?: mongoose.Types.ObjectId;
  tags: string[];
  images: IProductImage[];
  variants: IProductVariant[];
  isFeatured: boolean;
  isActive: boolean;
  isDigital: boolean;
  weight?: number;
  dimensions?: { length: number; width: number; height: number };
  metaTitle?: string;
  metaDescription?: string;
  ratingAvg: number;
  ratingCount: number;
  soldCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProductImageSchema = new Schema<IProductImage>({
  url: { type: String, required: true },
  altText: String,
  sortOrder: { type: Number, default: 0 },
  isPrimary: { type: Boolean, default: false },
}, { _id: false });

const ProductVariantSchema = new Schema<IProductVariant>({
  name: { type: String, required: true },
  type: { type: String, required: true },
  value: { type: String, required: true },
  priceModifier: { type: Number, default: 0 },
  inventory: { type: Number, default: 0 },
  sku: String,
  sortOrder: { type: Number, default: 0 },
}, { _id: true });

const ProductSchema = new Schema<IProduct>({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  description: { type: String, required: true },
  shortDescription: String,
  price: { type: Number, required: true, min: 0 },
  comparePrice: { type: Number, min: 0 },
  costPrice: { type: Number, min: 0 },
  sku: { type: String, unique: true, sparse: true },
  inventory: { type: Number, default: 0, min: 0 },
  lowStockThreshold: { type: Number, default: 5 },
  category: { type: Schema.Types.ObjectId, ref: 'Category' },
  tags: [String],
  images: [ProductImageSchema],
  variants: [ProductVariantSchema],
  isFeatured: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  isDigital: { type: Boolean, default: false },
  weight: Number,
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
  },
  metaTitle: String,
  metaDescription: String,
  ratingAvg: { type: Number, default: 0, min: 0, max: 5 },
  ratingCount: { type: Number, default: 0 },
  soldCount: { type: Number, default: 0 },
}, { timestamps: true });

ProductSchema.index({ category: 1 });
ProductSchema.index({ price: 1 });
ProductSchema.index({ isFeatured: 1 });
ProductSchema.index({ isActive: 1 });
ProductSchema.index({ name: 'text', description: 'text', tags: 'text' });

function generateCategoryPrefix(categoryName: string, existingPrefixes: Set<string>): string {
  // Clean name: keep only letters
  const clean = categoryName.replace(/[^a-zA-Z]/g, '').toUpperCase();
  
  // Try first 3 letters
  if (clean.length >= 3) {
    const first3 = clean.substring(0, 3);
    if (!existingPrefixes.has(first3)) return first3;
  }
  
  // Try using initials if multiple words
  const words = categoryName.split(/[\s,&]+/).filter(w => w.length > 0);
  if (words.length >= 3) {
    const initials = words.map(w => w[0].toUpperCase()).join('').replace(/[^A-Z]/g, '');
    if (initials.length >= 3) {
      const init3 = initials.substring(0, 3);
      if (!existingPrefixes.has(init3)) return init3;
    }
  }

  // Generate unique combinations from the clean name
  if (clean.length >= 3) {
    for (let i = 0; i < clean.length - 2; i++) {
      for (let j = i + 1; j < clean.length - 1; j++) {
        for (let k = j + 1; k < clean.length; k++) {
          const candidate = clean[i] + clean[j] + clean[k];
          if (!existingPrefixes.has(candidate)) {
            return candidate;
          }
        }
      }
    }
  }

  // Absolute fallback: search through all A-Z combinations
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (const a of alphabet) {
    for (const b of alphabet) {
      for (const c of alphabet) {
        const candidate = a + b + c;
        if (!existingPrefixes.has(candidate)) {
          return candidate;
        }
      }
    }
  }
  return 'GEN'; // default fallback
}

async function getOrCreateCategoryPrefix(categoryId: mongoose.Types.ObjectId): Promise<string> {
  const CategoryModel = mongoose.model('Category');
  const category = await CategoryModel.findById(categoryId);
  if (!category) return 'GEN';

  if ((category as any).skuPrefix && (category as any).skuPrefix.length === 3) {
    return (category as any).skuPrefix;
  }

  // Fetch all existing category prefixes to avoid collisions
  const categories = await CategoryModel.find({ skuPrefix: { $exists: true, $ne: null } }).select('skuPrefix').lean();
  const existingPrefixes = new Set<string>(categories.map((c: any) => c.skuPrefix));

  const prefix = generateCategoryPrefix((category as any).name, existingPrefixes);

  // Save the generated prefix to category
  (category as any).skuPrefix = prefix;
  await category.save();

  return prefix;
}

async function getNextSkuNumber(prefix: string): Promise<string> {
  const ProductModel = mongoose.model('Product');
  const pattern = new RegExp(`^${prefix}-\\d{3}$`);
  
  // Find all products matching this prefix
  const products = await ProductModel.find({ sku: pattern }).select('sku').lean();
  const numbers = products
    .map((p: any) => {
      const parts = p.sku.split('-');
      return parts.length === 2 ? parseInt(parts[1], 10) : NaN;
    })
    .filter((num: number) => !isNaN(num));

  const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  return String(nextNum).padStart(3, '0');
}

ProductSchema.pre('save', async function (next) {
  try {
    const ProductModel = mongoose.model('Product');
    let prefix = 'GEN';

    if (this.category) {
      prefix = await getOrCreateCategoryPrefix(this.category as mongoose.Types.ObjectId);
    }

    const skuRegex = new RegExp(`^${prefix}-\\d{3}$`);

    // We need to generate/correct SKU if:
    // 1. SKU is empty or null/undefined
    // 2. Category changed
    // 3. Current SKU doesn't match the expected category prefix and pattern
    const needsUpdate = !this.sku || this.isModified('category') || !skuRegex.test(this.sku);

    if (needsUpdate) {
      let numStr = '';
      if (this.sku) {
        // Try to extract digits from current SKU
        const match = this.sku.match(/\d+/);
        if (match) {
          numStr = match[0].padStart(3, '0');
        }
      }

      if (!numStr) {
        numStr = await getNextSkuNumber(prefix);
      }

      const candidateSku = `${prefix}-${numStr}`;

      // Ensure SKU is unique (avoid duplicate key error in MongoDB if custom number was taken)
      const isTaken = await ProductModel.findOne({ sku: candidateSku, _id: { $ne: this._id } }).select('_id').lean();
      if (isTaken) {
        const seqNum = await getNextSkuNumber(prefix);
        this.sku = `${prefix}-${seqNum}`;
      } else {
        this.sku = candidateSku;
      }
    } else {
      this.sku = this.sku.toUpperCase();
    }

    next();
  } catch (err: any) {
    next(err);
  }
});

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
