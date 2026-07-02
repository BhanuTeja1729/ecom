/**
 * seed.ts  —  Single authoritative seed for the entire platform.
 *
 * Categories are taken directly from frontend/public/img/ filenames.
 * Images are read as base64 data URIs and stored in MongoDB.
 * Run: npm run seed
 */
import '../config/env';
import * as fs from 'fs';
import * as path from 'path';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { User }     from '../models/User';
import { Category } from '../models/Category';
import { Product }  from '../models/Product';
import { Coupon }   from '../models/Coupon';
import { slugify }  from '../utils/helpers';

// ─── Image helper ────────────────────────────────────────────────────────────
const IMG_DIR = path.resolve(process.cwd(), '..', 'frontend', 'public', 'img');
const CAT_SUB_DIR = path.join(IMG_DIR, 'category');
const SUPPORTED = new Set(['.png', '.jpg', '.jpeg', '.webp']);

function mimeOf(ext: string): string {
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  return 'image/png';
}

function toDataUri(filename: string): string {
  const full = path.join(IMG_DIR, filename);
  if (!fs.existsSync(full)) {
    console.warn(`  ⚠️  Image not found: ${filename} — skipping imageUrl`);
    return '';
  }
  const b64 = fs.readFileSync(full).toString('base64');
  return `data:image/png;base64,${b64}`;
}

function toDataUriFromFilePath(filePath: string): string {
  if (!fs.existsSync(filePath)) return '';
  const ext = path.extname(filePath).toLowerCase();
  const b64 = fs.readFileSync(filePath).toString('base64');
  return `data:${mimeOf(ext)};base64,${b64}`;
}

const ROOT_ORDER: Record<string, number> = {
  'fruits-vegetables':        1,
  'dairy-bread-eggs':         2,
  'atta-rice-dal':            3,
  'masala-oil-more':          4,
  'snacks-munchies':          5,
  'cold-drinks-juices':       6,
  'tea-coffee-health-drink':  7,
  'breakfast-instant-food':   8,
  'bakery-biscuits':          9,
  'sauces-spreads':           10,
  'chicken-meat-fish':        11,
  'organic-healthy-living':   12,
  'sweet-tooth':              13,
  'personal-care':            14,
  'baby-care':                15,
  'pet-care':                 16,
  'cleaning-essentials':      17,
  'home-office':              18,
  'pharma-wellness':          19,
  'paan-corner':              20,
};

// ─── Categories  (exactly matching /public/img filenames) ────────────────────
const CATEGORIES = [
  { name: 'Fruits & Vegetables',       slug: 'fruits-vegetables',       sortOrder: 1,  description: 'Fresh fruits and vegetables',           file: 'Fruits & Vegetables.png' },
  { name: 'Dairy, Bread & Eggs',        slug: 'dairy-bread-eggs',        sortOrder: 2,  description: 'Milk, bread, butter and eggs',          file: 'Dairy, Bread & Eggs.png' },
  { name: 'Atta, Rice & Dal',           slug: 'atta-rice-dal',           sortOrder: 3,  description: 'Staple grains and lentils',              file: 'Atta, Rice & Dal.png' },
  { name: 'Masala, Oil & More',         slug: 'masala-oil-more',         sortOrder: 4,  description: 'Spices, oils and condiments',            file: 'Masala, Oil & More.png' },
  { name: 'Snacks & Munchies',          slug: 'snacks-munchies',         sortOrder: 5,  description: 'Chips, crackers and snacks',             file: 'Snacks & Munchies.png' },
  { name: 'Cold Drinks & Juices',       slug: 'cold-drinks-juices',      sortOrder: 6,  description: 'Beverages, juices and soft drinks',      file: 'Cold Drinks & Juices.png' },
  { name: 'Tea, Coffee & Health Drink', slug: 'tea-coffee-health-drink', sortOrder: 7,  description: 'Tea, coffee and health drinks',          file: 'Tea, Coffe & Health Drink.png' },
  { name: 'Breakfast & Instant Food',   slug: 'breakfast-instant-food',  sortOrder: 8,  description: 'Cereals, oats and instant meals',        file: 'Breakfast & Instant Food.png' },
  { name: 'Bakery & Biscuits',          slug: 'bakery-biscuits',         sortOrder: 9,  description: 'Biscuits, cookies and bakery items',     file: 'Bakery & Biscuits.png' },
  { name: 'Sauces & Spreads',           slug: 'sauces-spreads',          sortOrder: 10, description: 'Jams, ketchup and spreads',              file: 'Sauces & Spreads.png' },
  { name: 'Chicken, Meat & Fish',       slug: 'chicken-meat-fish',       sortOrder: 11, description: 'Fresh and frozen non-veg',              file: 'Chicken, Meat & Fish.png' },
  { name: 'Organic & Healthy Living',   slug: 'organic-healthy-living',  sortOrder: 12, description: 'Organic and health foods',              file: 'Organic & Healthy Living.png' },
  { name: 'Sweet Tooth',                slug: 'sweet-tooth',             sortOrder: 13, description: 'Chocolates, mithai and sweets',         file: 'Sweet Tooth.png' },
  { name: 'Personal Care',              slug: 'personal-care',           sortOrder: 14, description: 'Hygiene and personal care products',    file: 'Personal Care.png' },
  { name: 'Baby Care',                  slug: 'baby-care',               sortOrder: 15, description: 'Baby food, diapers and essentials',     file: 'Baby Care.png' },
  { name: 'Pet Care',                   slug: 'pet-care',                sortOrder: 16, description: 'Food and accessories for pets',         file: 'Pet Care.png' },
  { name: 'Cleaning Essentials',        slug: 'cleaning-essentials',     sortOrder: 17, description: 'Household cleaning products',           file: 'Cleaning Essentials.png' },
  { name: 'Home & Office',              slug: 'home-office',             sortOrder: 18, description: 'Home and office essentials',            file: 'Home & Office.png' },
  { name: 'Pharma & Wellness',          slug: 'pharma-wellness',         sortOrder: 19, description: 'Medicines and wellness products',       file: 'Pharma & Wellness.png' },
  { name: 'Paan Corner',               slug: 'paan-corner',             sortOrder: 20, description: 'Paan and mouth fresheners',             file: 'paan corner.png' },
];

// ─── Sample products  (one or two per relevant category) ────────────────────
// categorySlug links each product to a category after insertion
const SAMPLE_PRODUCTS = [
  // Fruits & Vegetables
  {
    name: 'Fresh Organic Bananas',
    slug: 'fresh-organic-bananas',
    categorySlug: 'fruits-vegetables-fresh-fruits',
    description: 'A bunch of 6 fresh organic bananas, rich in potassium and natural energy.',
    shortDescription: 'Bunch of 6 organic bananas',
    price: 49, comparePrice: 65, sku: 'FV-001', inventory: 200,
    tags: ['banana', 'fruit', 'organic'], isFeatured: true,
    images: [{ url: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600', altText: 'Bananas', sortOrder: 0, isPrimary: true }],
    ratingAvg: 4.7, ratingCount: 312,
  },
  {
    name: 'Red Fresh Tomatoes',
    slug: 'red-fresh-tomatoes',
    categorySlug: 'fruits-vegetables-fresh-vegetables',
    description: 'Farm-fresh red tomatoes, perfect for curries, salads, and chutneys.',
    shortDescription: '500g pack of fresh tomatoes',
    price: 35, comparePrice: 50, sku: 'FV-002', inventory: 150,
    tags: ['tomato', 'vegetable', 'fresh'], isFeatured: false,
    images: [{ url: 'https://images.unsplash.com/photo-1546470427-e26264be0b0d?w=600', altText: 'Tomatoes', sortOrder: 0, isPrimary: true }],
    ratingAvg: 4.5, ratingCount: 198,
  },

  // Dairy, Bread & Eggs
  {
    name: 'Amul Full Cream Milk',
    slug: 'amul-full-cream-milk',
    categorySlug: 'dairy-bread-eggs-milk',
    description: 'Pasteurised and homogenised full cream milk from Amul. 1 litre pack.',
    shortDescription: '1 Litre full cream milk',
    price: 68, sku: 'DB-001', inventory: 300,
    tags: ['milk', 'dairy', 'amul'], isFeatured: true,
    images: [{ url: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=600', altText: 'Milk', sortOrder: 0, isPrimary: true }],
    ratingAvg: 4.8, ratingCount: 520,
  },
  {
    name: 'Farm Fresh Eggs',
    slug: 'farm-fresh-eggs',
    categorySlug: 'dairy-bread-eggs-eggs',
    description: 'Free-range farm-fresh eggs. High in protein and essential nutrients. Pack of 12.',
    shortDescription: 'Pack of 12 free-range eggs',
    price: 89, comparePrice: 99, sku: 'DB-002', inventory: 250,
    tags: ['eggs', 'protein', 'fresh'], isFeatured: false,
    images: [{ url: 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=600', altText: 'Eggs', sortOrder: 0, isPrimary: true }],
    ratingAvg: 4.6, ratingCount: 410,
  },

  // Atta, Rice & Dal
  {
    name: 'Aashirvaad Whole Wheat Atta',
    slug: 'aashirvaad-whole-wheat-atta',
    categorySlug: 'atta-rice-dal-atta',
    description: 'Made from the finest whole wheat grains. Rich in fibre and ideal for soft rotis.',
    shortDescription: '5 kg whole wheat flour',
    price: 289, comparePrice: 320, sku: 'AR-001', inventory: 180,
    tags: ['atta', 'wheat', 'flour'], isFeatured: true,
    images: [{ url: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600', altText: 'Atta', sortOrder: 0, isPrimary: true }],
    ratingAvg: 4.8, ratingCount: 890,
  },
  {
    name: 'India Gate Basmati Rice',
    slug: 'india-gate-basmati-rice',
    categorySlug: 'atta-rice-dal-rice',
    description: 'Premium aged basmati rice with long grains and a rich aroma. 5 kg pack.',
    shortDescription: '5 kg premium basmati rice',
    price: 499, comparePrice: 560, sku: 'AR-002', inventory: 120,
    tags: ['rice', 'basmati', 'premium'], isFeatured: true,
    images: [{ url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600', altText: 'Basmati Rice', sortOrder: 0, isPrimary: true }],
    ratingAvg: 4.9, ratingCount: 1100,
  },

  // Snacks & Munchies
  {
    name: "Lay's Classic Salted Chips",
    slug: 'lays-classic-salted-chips',
    categorySlug: 'snacks-munchies-chips-crisps',
    description: 'Crispy and light classic salted potato chips. The perfect any-time snack. 55g pack.',
    shortDescription: 'Classic salted potato chips 55g',
    price: 20, comparePrice: 25, sku: 'SN-001', inventory: 500,
    tags: ['chips', 'snacks', 'lays'], isFeatured: true,
    images: [{ url: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=600', altText: "Lay's Chips", sortOrder: 0, isPrimary: true }],
    ratingAvg: 4.5, ratingCount: 760,
  },

  // Cold Drinks & Juices
  {
    name: 'Real Fruit Juice Mixed Fruit',
    slug: 'real-fruit-juice-mixed-fruit',
    categorySlug: 'cold-drinks-juices-fruit-juices',
    description: 'Dabur Real mixed fruit juice — no added sugar. 1 litre pack.',
    shortDescription: '1L mixed fruit juice, no added sugar',
    price: 115, comparePrice: 130, sku: 'CD-001', inventory: 200,
    tags: ['juice', 'fruit', 'dabur', 'real'], isFeatured: false,
    images: [{ url: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=600', altText: 'Fruit Juice', sortOrder: 0, isPrimary: true }],
    ratingAvg: 4.4, ratingCount: 230,
  },

  // Tea, Coffee & Health Drink
  {
    name: 'Tata Tea Premium',
    slug: 'tata-tea-premium',
    categorySlug: 'tea-coffee-health-drink-tea',
    description: 'A rich, strong cup of tea with every brew. Tata Tea Premium 500g pack.',
    shortDescription: '500g premium blend tea',
    price: 225, comparePrice: 250, sku: 'TC-001', inventory: 300,
    tags: ['tea', 'tata', 'beverage'], isFeatured: false,
    images: [{ url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600', altText: 'Tea', sortOrder: 0, isPrimary: true }],
    ratingAvg: 4.7, ratingCount: 680,
  },

  // Bakery & Biscuits
  {
    name: 'Britannia Good Day Butter Cookies',
    slug: 'britannia-good-day-butter-cookies',
    categorySlug: 'bakery-biscuits-cookies',
    description: 'Buttery, crisp and delicious cookies with a rich aroma. 200g pack.',
    shortDescription: 'Butter cookies 200g',
    price: 35, comparePrice: 40, sku: 'BB-001', inventory: 400,
    tags: ['cookies', 'biscuits', 'britannia'], isFeatured: false,
    images: [{ url: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600', altText: 'Cookies', sortOrder: 0, isPrimary: true }],
    ratingAvg: 4.6, ratingCount: 540,
  },

  // Sweet Tooth
  {
    name: 'Cadbury Dairy Milk Silk',
    slug: 'cadbury-dairy-milk-silk',
    categorySlug: 'sweet-tooth-chocolates',
    description: 'Smooth, creamy and indulgent milk chocolate. Cadbury Dairy Milk Silk 150g.',
    shortDescription: 'Silky smooth milk chocolate 150g',
    price: 175, comparePrice: 195, sku: 'SW-001', inventory: 250,
    tags: ['chocolate', 'cadbury', 'sweets'], isFeatured: true,
    images: [{ url: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=600', altText: 'Chocolate', sortOrder: 0, isPrimary: true }],
    ratingAvg: 4.9, ratingCount: 1250,
  },

  // Personal Care
  {
    name: 'Dove Moisturising Body Wash',
    slug: 'dove-moisturising-body-wash',
    categorySlug: 'personal-care-shower-gels-scrubs',
    description: 'Gentle, creamy body wash that moisturises your skin as you shower. 500ml.',
    shortDescription: 'Moisturising body wash 500ml',
    price: 349, comparePrice: 399, sku: 'PC-001', inventory: 180,
    tags: ['bodywash', 'dove', 'skincare', 'personal-care'], isFeatured: true,
    images: [{ url: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600', altText: 'Body Wash', sortOrder: 0, isPrimary: true }],
    ratingAvg: 4.7, ratingCount: 430,
  },

  // Pharma & Wellness
  {
    name: 'Revital H Multivitamin',
    slug: 'revital-h-multivitamin',
    categorySlug: 'pharma-wellness-vitamins-daily-nutrition',
    description: 'Complete multivitamin and mineral supplement for energy, immunity and vitality. 30 capsules.',
    shortDescription: '30 capsules multivitamin supplement',
    price: 299, comparePrice: 350, sku: 'PW-001', inventory: 120,
    tags: ['vitamins', 'supplement', 'wellness'], isFeatured: false,
    images: [{ url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600', altText: 'Vitamins', sortOrder: 0, isPrimary: true }],
    ratingAvg: 4.5, ratingCount: 320,
  },

  // Masala, Oil & More
  {
    name: 'MDH Garam Masala',
    slug: 'mdh-garam-masala',
    categorySlug: 'masala-oil-more-powdered-spices',
    description: 'Authentic blend of spices for a rich, aromatic flavour in every dish. 100g pack.',
    shortDescription: 'Aromatic garam masala blend 100g',
    price: 75, comparePrice: 90, sku: 'MO-001', inventory: 350,
    tags: ['masala', 'spice', 'mdh'], isFeatured: false,
    images: [{ url: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600', altText: 'Garam Masala', sortOrder: 0, isPrimary: true }],
    ratingAvg: 4.8, ratingCount: 670,
  },
];

// ─── Coupons ─────────────────────────────────────────────────────────────────
const COUPONS = [
  { code: 'WELCOME10', description: '10% off for new customers',        discountType: 'percentage' as const, discountValue: 10,  minimumOrderAmount: 200, usageLimit: 1000 },
  { code: 'FLAT50',    description: '₹50 off on orders above ₹500',    discountType: 'fixed'      as const, discountValue: 50,  minimumOrderAmount: 500 },
  { code: 'FRESH20',   description: '20% off on fresh produce',        discountType: 'percentage' as const, discountValue: 20,  minimumOrderAmount: 300, maximumDiscountAmount: 200, expiresAt: new Date('2026-12-31') },
];

// ─── Seed ────────────────────────────────────────────────────────────────────
async function seed() {
  try {
    await connectDB();
    console.log('🌱 Starting seed...\n');

    // Clear everything
    await Promise.all([User.deleteMany({}), Category.deleteMany({}), Product.deleteMany({}), Coupon.deleteMany({})]);
    console.log('🗑️  Cleared existing data\n');

    // ── Users ──
    const admin    = await User.create({ fullName: 'Admin User',    email: 'admin@ecom.dev',    password: 'Admin@123456',    role: 'admin',    isVerified: true });
    const customer = await User.create({ fullName: 'Test Customer', email: 'customer@ecom.dev', password: 'Customer@123456', role: 'customer', isVerified: true });
    console.log(`👤 Admin:    ${admin.email}`);
    console.log(`👤 Customer: ${customer.email}\n`);

    // ── Categories with base64 images ──
    console.log('📂 Loading category images from:', IMG_DIR);

    // 1. Root-level PNGs → top-level categories
    const rootFiles = fs.readdirSync(IMG_DIR).filter(f => {
      const ext = path.extname(f).toLowerCase();
      return SUPPORTED.has(ext) && fs.statSync(path.join(IMG_DIR, f)).isFile();
    });

    const categoryDocs = [];

    for (const [i, file] of rootFiles.entries()) {
      const fullPath  = path.join(IMG_DIR, file);
      const nameNoExt = path.basename(file, path.extname(file));
      const slug      = slugify(nameNoExt);
      const imageUrl  = toDataUriFromFilePath(fullPath);
      const order     = ROOT_ORDER[slug] ?? (100 + i);

      const doc = await Category.create({
        name: nameNoExt,
        slug,
        imageUrl,
        sortOrder: order,
        isActive: true
      });
      categoryDocs.push(doc);
    }
    console.log(`✅ Created ${categoryDocs.length} top-level categories`);

    // 2. Subcategory images → child categories
    let subcategoryCount = 0;
    if (fs.existsSync(CAT_SUB_DIR)) {
      const parentFolders = fs.readdirSync(CAT_SUB_DIR).filter(d =>
        fs.statSync(path.join(CAT_SUB_DIR, d)).isDirectory()
      );

      for (const parentName of parentFolders) {
        const parentSlug = slugify(parentName);
        let parentDoc = await Category.findOne({ slug: parentSlug });
        if (!parentDoc) {
          parentDoc = await Category.create({
            name: parentName,
            slug: parentSlug,
            sortOrder: 99,
            isActive: true
          });
          categoryDocs.push(parentDoc);
        }
        const parentId = parentDoc._id;

        const subDir = path.join(CAT_SUB_DIR, parentName);
        const subFiles = fs.readdirSync(subDir).filter(f => {
          const ext = path.extname(f).toLowerCase();
          return SUPPORTED.has(ext) && fs.statSync(path.join(subDir, f)).isFile();
        });

        for (const [idx, file] of subFiles.entries()) {
          const fullPath  = path.join(subDir, file);
          const nameNoExt = path.basename(file, path.extname(file));
          const slug      = slugify(`${parentSlug}-${nameNoExt}`);
          const imageUrl  = toDataUriFromFilePath(fullPath);

          const doc = await Category.create({
            name:      nameNoExt,
            slug,
            imageUrl,
            parent:    parentId as mongoose.Types.ObjectId,
            sortOrder: idx + 1,
            isActive:  true,
          });
          categoryDocs.push(doc);
          subcategoryCount++;
        }
      }
    }
    console.log(`✅ Created ${subcategoryCount} subcategories\n`);

    // Build slug → _id map for all categories (parents & subcategories)
    const catMap = new Map(categoryDocs.map(c => [c.slug, c._id]));

    // ── Products ──
    const productDocs = SAMPLE_PRODUCTS.map(p => {
      const { categorySlug, ...rest } = p;
      const categoryId = catMap.get(categorySlug);
      if (!categoryId) {
        console.warn(`  ⚠️ Category slug not found for product "${p.name}": ${categorySlug}`);
      }
      return { ...rest, category: categoryId };
    });
    
    const created = [];
    for (const doc of productDocs) {
      const prod = await Product.create(doc);
      created.push(prod);
    }
    console.log(`📦 Created ${created.length} products\n`);

    // ── Coupons ──
    await Coupon.insertMany(COUPONS);
    console.log(`🎫 Created ${COUPONS.length} coupons\n`);

    console.log('✅ Seed complete!\n');
    console.log('📋 Credentials:');
    console.log('   Admin:    admin@ecom.dev    / Admin@123456');
    console.log('   Customer: customer@ecom.dev / Customer@123456');
    console.log('\n🎫 Coupons: WELCOME10 · FLAT50 · FRESH20\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
}

seed();
