import '../config/env';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { Product } from '../models/Product';
import { Category } from '../models/Category';

async function check() {
  await connectDB();
  const productCount = await Product.countDocuments();
  const categoryCount = await Category.countDocuments();
  const parentCats = await Category.countDocuments({ parent: null });
  const subCats = await Category.countDocuments({ parent: { $ne: null } });
  const sampleProducts = await Product.find().limit(5).select('name price category images').lean();

  console.log('\n📊 Database Status:');
  console.log(`   Total Products   : ${productCount}`);
  console.log(`   Total Categories : ${categoryCount} (${parentCats} parent, ${subCats} sub)`);
  console.log('\n📦 Sample Products:');
  for (const p of sampleProducts) {
    console.log(`   - ${p.name} | ₹${p.price} | Images: ${(p.images as any[]).length}`);
  }
  await mongoose.disconnect();
}

check().catch(err => { console.error(err); process.exit(1); });
