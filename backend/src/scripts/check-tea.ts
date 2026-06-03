import '../config/env';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { Product } from '../models/Product';

async function checkTea() {
  await connectDB();
  const tea = await Product.findOne({ name: /tea/i }).lean();
  console.log('Tea Product in DB:', JSON.stringify(tea, null, 2));
  await mongoose.disconnect();
}

checkTea();
