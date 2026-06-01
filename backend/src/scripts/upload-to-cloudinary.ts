import '../config/env';
import * as fs from 'fs';
import * as path from 'path';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import cloudinary from '../config/cloudinary';
import { Category } from '../models/Category';
import { Product } from '../models/Product';
import { Media } from '../models/Media';
import { slugify } from '../utils/helpers';

// Resolve paths
const FRONTEND_PUBLIC = path.resolve(process.cwd(), '..', 'frontend', 'public');
const SUB_CAT_DIR = path.join(FRONTEND_PUBLIC, 'products', 'img', 'category');

function getCategoryImageFile(catName: string): string | null {
  const options = [
    `${catName}.png`,
    `${catName.replace('  ', ' & ')}.png`,
    `${catName.replace(' & ', '  ')}.png`,
    `${catName.toLowerCase()}.png`
  ];
  for (const opt of options) {
    const full = path.join(FRONTEND_PUBLIC, 'img', opt);
    if (fs.existsSync(full)) return full;
  }
  return null;
}

const SUPPORTED_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

function sanitizeCloudinaryPath(name: string): string {
  return name
    .replace(/&/g, 'and')
    .replace(/,/g, '')
    .replace(/[^a-zA-Z0-9\s\-_]/g, '')
    .trim();
}

async function run() {
  await connectDB();
  console.log('🚀 Starting Cloudinary category and product image upload...\n');
  console.log(`📂 Source Directory: ${SUB_CAT_DIR}\n`);

  if (!fs.existsSync(SUB_CAT_DIR)) {
    console.error('❌ Subcategory directory not found!');
    process.exit(1);
  }

  const categoryFolders = fs.readdirSync(SUB_CAT_DIR).filter(d => 
    fs.statSync(path.join(SUB_CAT_DIR, d)).isDirectory()
  );

  let totalCategoriesProcessed = 0;
  let totalProductsProcessed = 0;

  for (const categoryName of categoryFolders) {
    console.log(`\n══════════════════════════════════════════════════`);
    console.log(`📂 Processing Category: "${categoryName}"`);
    console.log(`══════════════════════════════════════════════════`);

    // 1. Find or create Category in DB
    const catSlug = slugify(categoryName);
    let category = await Category.findOne({ slug: catSlug });
    if (!category) {
      category = await Category.create({
        name: categoryName,
        slug: catSlug,
        sortOrder: 50,
        isActive: true,
      });
      console.log(`  🆕 Created Category document in MongoDB: ${categoryName}`);
    } else {
      console.log(`  📂 Found Category document in MongoDB: ${categoryName}`);
    }

    // 2. Upload Category image to Cloudinary (if not already done)
    const catImgPath = getCategoryImageFile(categoryName);
    if (catImgPath) {
      const catFolder = `Blipzo/${sanitizeCloudinaryPath(categoryName)}`;
      const fileName = path.basename(catImgPath);
      
      const existingMedia = await Media.findOne({ fileName, folder: catFolder });
      if (existingMedia) {
        console.log(`  ⏭️ Category image already uploaded: ${existingMedia.url}`);
        if (category.imageUrl !== existingMedia.url) {
          category.imageUrl = existingMedia.url;
          await category.save();
        }
      } else {
        console.log(`  📤 Uploading Category image to Cloudinary: ${fileName}`);
        try {
          const result = await cloudinary.uploader.upload(catImgPath, {
            folder: catFolder,
            resource_type: 'image',
          });

          const media = await Media.create({
            url: result.secure_url,
            publicId: result.public_id,
            folder: catFolder,
            fileName,
            resourceType: result.resource_type,
            format: result.format,
            size: result.bytes,
            width: result.width,
            height: result.height,
            associatedType: 'category',
            associatedId: category._id as mongoose.Types.ObjectId,
          });

          category.imageUrl = result.secure_url;
          await category.save();
          console.log(`  ✅ Uploaded Category Image: ${result.secure_url}`);
        } catch (err: any) {
          console.error(`  ❌ Failed to upload category image ${fileName}:`, err.message);
        }
      }
    } else {
      console.warn(`  ⚠️ Category image file not found for: ${categoryName}`);
    }

    totalCategoriesProcessed++;

    // 3. Process Product files inside Category folder
    const catDirPath = path.join(SUB_CAT_DIR, categoryName);
    const productFiles = fs.readdirSync(catDirPath).filter(f => {
      const ext = path.extname(f).toLowerCase();
      return SUPPORTED_EXTS.has(ext) && fs.statSync(path.join(catDirPath, f)).isFile();
    });

    for (const file of productFiles) {
      const productName = path.basename(file, path.extname(file));
      const prodImgPath = path.join(catDirPath, file);
      const prodFolder = `Blipzo/${sanitizeCloudinaryPath(categoryName)}/${sanitizeCloudinaryPath(productName)}`;

      console.log(`  📦 Product: "${productName}"`);

      // Check if already uploaded
      const existingMedia = await Media.findOne({ fileName: file, folder: prodFolder });
      let productUrl = '';

      if (existingMedia) {
        console.log(`    ⏭️ Product image already uploaded: ${existingMedia.url}`);
        productUrl = existingMedia.url;

        // Ensure product exists in DB and is linked
        let product = await Product.findOne({ name: productName, category: category._id });
        if (!product) {
          product = await Product.create({
            name: productName,
            slug: slugify(productName) + '-' + Math.floor(Math.random() * 10000),
            description: `${productName} from category ${categoryName}`,
            price: Math.floor(Math.random() * 450) + 50,
            comparePrice: Math.floor(Math.random() * 50) + 500,
            sku: `PROD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            inventory: Math.floor(Math.random() * 150) + 50,
            category: category._id as mongoose.Types.ObjectId,
            images: [{ url: productUrl, altText: productName, isPrimary: true, sortOrder: 0 }],
            isActive: true,
          });
          console.log(`    🆕 Created Product in DB`);
          existingMedia.associatedId = product._id as mongoose.Types.ObjectId;
          await existingMedia.save();
        }
      } else {
        console.log(`    📤 Uploading Product image to Cloudinary...`);
        try {
          const result = await cloudinary.uploader.upload(prodImgPath, {
            folder: prodFolder,
            resource_type: 'image',
          });

          productUrl = result.secure_url;

          // Find or create product
          let product = await Product.findOne({ name: productName, category: category._id });
          if (!product) {
            product = await Product.create({
              name: productName,
              slug: slugify(productName) + '-' + Math.floor(Math.random() * 10000),
              description: `${productName} from category ${categoryName}`,
              price: Math.floor(Math.random() * 450) + 50,
              comparePrice: Math.floor(Math.random() * 50) + 500,
              sku: `PROD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              inventory: Math.floor(Math.random() * 150) + 50,
              category: category._id as mongoose.Types.ObjectId,
              images: [{ url: productUrl, altText: productName, isPrimary: true, sortOrder: 0 }],
              isActive: true,
            });
            console.log(`    🆕 Created Product in DB`);
          } else {
            if (!product.images.some(img => img.url === productUrl)) {
              product.images.push({ url: productUrl, altText: productName, isPrimary: product.images.length === 0, sortOrder: product.images.length });
              await product.save();
              console.log(`    🔄 Linked image to existing Product`);
            }
          }

          // Create lookup
          await Media.create({
            url: result.secure_url,
            publicId: result.public_id,
            folder: prodFolder,
            fileName: file,
            resourceType: result.resource_type,
            format: result.format,
            size: result.bytes,
            width: result.width,
            height: result.height,
            associatedType: 'product',
            associatedId: product._id as mongoose.Types.ObjectId,
          });

          console.log(`    ✅ Upload Completed: ${result.secure_url}`);
        } catch (err: any) {
          console.error(`    ❌ Failed to upload product image:`, err.message);
        }
      }
      totalProductsProcessed++;
    }
  }

  console.log(`\n══════════════════════════════════════════════════`);
  console.log('🎉 Seeding and upload complete!');
  console.log(`📊 Categories processed : ${totalCategoriesProcessed}`);
  console.log(`📊 Products processed   : ${totalProductsProcessed}`);
  console.log(`══════════════════════════════════════════════════\n`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
