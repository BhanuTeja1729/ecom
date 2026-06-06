import '../config/env';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { Category } from '../models/Category';
import { Product } from '../models/Product';

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

async function runMigration() {
  try {
    console.log('Connecting to database...');
    await connectDB();
    console.log('Database connected.');

    // 1. Fetch all categories
    const categories = await Category.find({});
    console.log(`Found ${categories.length} categories.`);

    const existingPrefixes = new Set<string>();

    // First reset all prefixes so we don't have unique collision errors while updating them one-by-one
    for (const cat of categories) {
      cat.skuPrefix = undefined;
      await cat.save();
    }

    // Generate and save unique prefixes for categories
    for (const cat of categories) {
      const prefix = generateCategoryPrefix(cat.name, existingPrefixes);
      existingPrefixes.add(prefix);
      cat.skuPrefix = prefix;
      await cat.save();
      console.log(`  🏷️  Category "${cat.name}" -> Prefix: "${prefix}"`);
    }

    // 2. Fetch all products
    const products = await Product.find({});
    console.log(`Found ${products.length} products.`);

    // Clear product SKUs so that they are regenerated from scratch sequentially
    for (const prod of products) {
      (prod as any).sku = undefined;
      await prod.save();
    }

    // Save each product sequentially so that the pre-save hook generates fresh, valid SKUs
    for (const prod of products) {
      await prod.save();
      console.log(`  📦 Product "${prod.name}" -> SKU: "${prod.sku}"`);
    }

    console.log('Migration completed successfully.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
