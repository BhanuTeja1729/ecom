/**
 * migrate-categories.ts
 * Run: ts-node src/scripts/migrate-categories.ts
 *
 * Reads each PNG from frontend/public/img/, converts it to a base64
 * data URI, and stores it directly in the Category.imageUrl field in MongoDB.
 * No local file server needed — images are served from MongoDB via the API.
 */
import '../config/env';
import * as fs from 'fs';
import * as path from 'path';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { Category } from '../models/Category';

// Resolve from the backend project root → sibling frontend folder
const IMG_DIR = path.resolve(process.cwd(), '..', 'frontend', 'public', 'img');

const CATEGORIES = [
  { name: 'Fruits & Vegetables',         slug: 'fruits-vegetables',       sortOrder: 1,  description: 'Fresh fruits and vegetables',                file: 'Fruits & Vegetables.png' },
  { name: 'Dairy, Bread & Eggs',          slug: 'dairy-bread-eggs',        sortOrder: 2,  description: 'Milk, bread, butter and eggs',               file: 'Dairy, Bread & Eggs.png' },
  { name: 'Atta, Rice & Dal',             slug: 'atta-rice-dal',           sortOrder: 3,  description: 'Staple grains and lentils',                   file: 'Atta, Rice & Dal.png' },
  { name: 'Masala, Oil & More',           slug: 'masala-oil-more',         sortOrder: 4,  description: 'Spices, oils and condiments',                 file: 'Masala, Oil & More.png' },
  { name: 'Snacks & Munchies',            slug: 'snacks-munchies',         sortOrder: 5,  description: 'Chips, crackers and snacks',                  file: 'Snacks & Munchies.png' },
  { name: 'Cold Drinks & Juices',         slug: 'cold-drinks-juices',      sortOrder: 6,  description: 'Beverages, juices and soft drinks',           file: 'Cold Drinks & Juices.png' },
  { name: 'Tea, Coffee & Health Drink',   slug: 'tea-coffee-health-drink', sortOrder: 7,  description: 'Tea, coffee and health drinks',               file: 'Tea, Coffe & Health Drink.png' },
  { name: 'Breakfast & Instant Food',     slug: 'breakfast-instant-food',  sortOrder: 8,  description: 'Cereals, oats and instant meals',             file: 'Breakfast & Instant Food.png' },
  { name: 'Bakery & Biscuits',            slug: 'bakery-biscuits',         sortOrder: 9,  description: 'Biscuits, cookies and bakery items',          file: 'Bakery & Biscuits.png' },
  { name: 'Sauces & Spreads',             slug: 'sauces-spreads',          sortOrder: 10, description: 'Jams, ketchup and spreads',                   file: 'Sauces & Spreads.png' },
  { name: 'Chicken, Meat & Fish',         slug: 'chicken-meat-fish',       sortOrder: 11, description: 'Fresh and frozen non-veg',                   file: 'Chicken, Meat & Fish.png' },
  { name: 'Organic & Healthy Living',     slug: 'organic-healthy-living',  sortOrder: 12, description: 'Organic and health foods',                   file: 'Organic & Healthy Living.png' },
  { name: 'Sweet Tooth',                  slug: 'sweet-tooth',             sortOrder: 13, description: 'Chocolates, mithai and sweets',               file: 'Sweet Tooth.png' },
  { name: 'Personal Care',               slug: 'personal-care',           sortOrder: 14, description: 'Hygiene and personal care products',          file: 'Personal Care.png' },
  { name: 'Baby Care',                    slug: 'baby-care',               sortOrder: 15, description: 'Baby food, diapers and essentials',           file: 'Baby Care.png' },
  { name: 'Pet Care',                     slug: 'pet-care',                sortOrder: 16, description: 'Food and accessories for pets',               file: 'Pet Care.png' },
  { name: 'Cleaning Essentials',          slug: 'cleaning-essentials',     sortOrder: 17, description: 'Household cleaning products',                 file: 'Cleaning Essentials.png' },
  { name: 'Home & Office',               slug: 'home-office',             sortOrder: 18, description: 'Home and office essentials',                  file: 'Home & Office.png' },
  { name: 'Pharma & Wellness',            slug: 'pharma-wellness',         sortOrder: 19, description: 'Medicines and wellness products',             file: 'Pharma & Wellness.png' },
  { name: 'Paan Corner',                  slug: 'paan-corner',             sortOrder: 20, description: 'Paan and mouth fresheners',                   file: 'paan corner.png' },
];

function toDataUri(filePath: string): string {
  const buffer = fs.readFileSync(filePath);
  const base64 = buffer.toString('base64');
  return `data:image/png;base64,${base64}`;
}

async function run() {
  await connectDB();
  console.log('\n📂 Reading images from:', IMG_DIR);
  console.log('📤 Upserting categories into MongoDB...\n');

  let created = 0, updated = 0, errors = 0;

  for (const cat of CATEGORIES) {
    const filePath = path.join(IMG_DIR, cat.file);

    if (!fs.existsSync(filePath)) {
      console.error(`  ❌ File not found: ${cat.file}`);
      errors++;
      continue;
    }

    const imageUrl = toDataUri(filePath);
    const sizeKb = Math.round(imageUrl.length / 1024);

    const existing = await Category.findOne({ slug: cat.slug });

    await Category.findOneAndUpdate(
      { slug: cat.slug },
      {
        $set: {
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          imageUrl,          // base64 data URI — no external URL needed
          sortOrder: cat.sortOrder,
          isActive: true,
        },
      },
      { upsert: true, new: true }
    );

    if (existing) {
      updated++;
      console.log(`  🔄 Updated : ${cat.name.padEnd(35)} (${sizeKb} KB)`);
    } else {
      created++;
      console.log(`  ✅ Created : ${cat.name.padEnd(35)} (${sizeKb} KB)`);
    }
  }

  console.log('\n─────────────────────────────────────────');
  console.log(`✅ Done — ${created} created, ${updated} updated, ${errors} errors`);
  console.log('Images are now stored in MongoDB and served via the /api/v1/categories endpoint.\n');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('\n❌ Migration failed:', err.message);
  process.exit(1);
});
