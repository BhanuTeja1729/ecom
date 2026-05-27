/**
 * upload-images.ts
 * Run: npm run upload:images
 *
 * Upserts all 20 category images from frontend/public/img/ into MongoDB
 * WITHOUT touching products, users, orders, or coupons.
 */
import '../config/env';
import * as fs   from 'fs';
import * as path from 'path';
import mongoose  from 'mongoose';
import { connectDB } from '../config/db';
import { Category }  from '../models/Category';

const IMG_DIR = path.resolve(process.cwd(), '..', 'frontend', 'public', 'img');

function toDataUri(filename: string): string | undefined {
  const full = path.join(IMG_DIR, filename);
  if (!fs.existsSync(full)) return undefined;
  return `data:image/png;base64,${fs.readFileSync(full).toString('base64')}`;
}

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

async function run() {
  await connectDB();
  console.log('\n📸 Uploading all category images to MongoDB...');
  console.log('📁 Source:', IMG_DIR, '\n');

  let ok = 0, missing = 0;

  for (const cat of CATEGORIES) {
    const imageUrl = toDataUri(cat.file);

    if (!imageUrl) {
      console.error(`  ❌ Not found : ${cat.file}`);
      missing++;
      continue;
    }

    const sizeKb = Math.round(imageUrl.length / 1024);

    await Category.findOneAndUpdate(
      { slug: cat.slug },
      {
        $set: {
          name:        cat.name,
          slug:        cat.slug,
          description: cat.description,
          sortOrder:   cat.sortOrder,
          imageUrl,
          isActive:    true,
        },
      },
      { upsert: true, new: true }
    );

    console.log(`  ✅ [${String(cat.sortOrder).padStart(2, '0')}] ${cat.name.padEnd(32)} ${sizeKb} KB`);
    ok++;
  }

  console.log(`\n${'─'.repeat(52)}`);
  console.log(`✅ Done — ${ok} images uploaded, ${missing} missing\n`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('\n❌ Upload failed:', err.message);
  process.exit(1);
});
