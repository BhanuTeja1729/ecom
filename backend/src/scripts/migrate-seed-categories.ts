/**
 * migrate-seed-categories.ts
 * Run: ts-node src/scripts/migrate-seed-categories.ts
 *
 * Reads the 5 generated category images (stored in the Gemini artifacts dir)
 * and upserts their base64 data URIs into the existing seed categories in MongoDB.
 */
import '../config/env';
import * as fs from 'fs';
import * as path from 'path';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { Category } from '../models/Category';

// Absolute paths to the generated images
const ARTIFACTS = 'C:\\Users\\hp\\.gemini\\antigravity\\brain\\3273a8d1-d185-4a98-9a28-621cfcd5611b';

const SEED_CATEGORIES = [
  {
    slug: 'electronics',
    name: 'Electronics',
    description: 'Gadgets, devices and tech accessories',
    imgFile: path.join(ARTIFACTS, 'cat_electronics_1778473790140.png'),
  },
  {
    slug: 'clothing',
    name: 'Clothing',
    description: 'Fashion for everyone',
    imgFile: path.join(ARTIFACTS, 'cat_clothing_1778473802997.png'),
  },
  {
    slug: 'sports',
    name: 'Sports',
    description: 'Gear up for your next adventure',
    imgFile: path.join(ARTIFACTS, 'cat_sports_1778473818987.png'),
  },
  {
    slug: 'beauty',
    name: 'Beauty',
    description: 'Look and feel your best',
    imgFile: path.join(ARTIFACTS, 'cat_beauty_1778473832505.png'),
  },
  {
    slug: 'home-living',
    name: 'Home & Living',
    description: 'Make your space beautiful',
    imgFile: path.join(ARTIFACTS, 'cat_home_living_1778473847337.png'),
  },
];

function toDataUri(filePath: string): string {
  const buffer = fs.readFileSync(filePath);
  const base64 = buffer.toString('base64');
  // Detect mime type from file extension
  const ext = path.extname(filePath).toLowerCase().replace('.', '');
  const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
  return `data:${mime};base64,${base64}`;
}

async function run() {
  await connectDB();
  console.log('\n🖼️  Uploading seed category images to MongoDB...\n');

  for (const cat of SEED_CATEGORIES) {
    if (!fs.existsSync(cat.imgFile)) {
      console.error(`  ❌ Image not found: ${cat.imgFile}`);
      continue;
    }

    const imageUrl = toDataUri(cat.imgFile);
    const sizeKb = Math.round(imageUrl.length / 1024);

    await Category.findOneAndUpdate(
      { slug: cat.slug },
      { $set: { imageUrl, name: cat.name, description: cat.description, isActive: true } },
      { upsert: true, new: true }
    );

    console.log(`  ✅ ${cat.name.padEnd(20)} → stored ${sizeKb} KB in MongoDB`);
  }

  console.log('\n✅ All 5 seed category images uploaded to MongoDB.\n');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('\n❌ Failed:', err.message);
  process.exit(1);
});
