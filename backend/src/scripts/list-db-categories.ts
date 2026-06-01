
import '../config/env';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { Category } from '../models/Category';

async function listCategories() {
  await connectDB();
  const categories = await Category.find({}).sort({ name: 1 }).lean();
  console.log(`Found ${categories.length} categories in database:`);
  categories.forEach(cat => {
    console.log(`- Name: "${cat.name}", Slug: "${cat.slug}", Parent: ${cat.parent ? cat.parent : 'None'}`);
  });
  await mongoose.disconnect();
}

listCategories();
