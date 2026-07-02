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

// ─── Paths ──────────────────────────────────────────────────────────────────
const FRONTEND_PUBLIC = path.resolve(process.cwd(), '..', 'frontend', 'public');
const PRODUCT_ROOT = path.join(FRONTEND_PUBLIC, 'product');

const SUPPORTED_IMG_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

// ─── Price Map (INR) ─────────────────────────────────────────────────────────
// Hardcoded realistic prices per product name. Script falls back to a
// category-based default if a product is not listed here.
const PRICE_MAP: Record<string, { price: number; comparePrice: number }> = {
  // Atta, Rice & Dal — Atta
  'Aashirvaad Superior MP Whole Wheat Atta': { price: 340, comparePrice: 380 },
  'Fortune Chakki Fresh (100% Atta, 0% Maida) Atta': { price: 280, comparePrice: 320 },
  'Pro Nature Whole Wheat Organic Atta': { price: 420, comparePrice: 480 },

  // Atta, Rice & Dal — Besan, Sooji & Maida
  'Fortune Maida': { price: 75, comparePrice: 90 },
  'Natureland Chana Organic Besan': { price: 160, comparePrice: 190 },
  'Rajdhani Besan (1 kg)': { price: 110, comparePrice: 130 },
  'Samrat MP SoojiRava': { price: 65, comparePrice: 80 },
  'Tata Sampann 100% Chana Dal Fine BesanGram Flour': { price: 125, comparePrice: 145 },

  // Atta, Rice & Dal — Millet & Other Flours
  'K-Pra Thalipeeth Bhajani Flour Mix': { price: 180, comparePrice: 210 },
  'Rajdhani Chana Sattu': { price: 90, comparePrice: 110 },
  'True Elements Super Grains Oat Flour': { price: 220, comparePrice: 260 },

  // Atta, Rice & Dal — Moong & Masoor
  'Basic Moong Dal (Dhuli)': { price: 120, comparePrice: 145 },
  'Tata Sampann Unpolished Green Moong (Sabut) Whole Dal': { price: 155, comparePrice: 180 },
  'Tata Sampann Unpolished Yellow Moong Dal (Dhuli) Split': { price: 145, comparePrice: 170 },

  // Atta, Rice & Dal — Poha, Daliya & Other Grains
  '24 Mantra Organic White Poha': { price: 130, comparePrice: 155 },
  'Fortune Indori Thick Poha': { price: 85, comparePrice: 100 },
  "MP'S BEST Lokwan Wheat": { price: 95, comparePrice: 115 },
  'Millets & More Cheese Millet Bhel': { price: 160, comparePrice: 190 },

  // Atta, Rice & Dal — Rajma, Chhole & Others
  'Nutrela Soya Granules': { price: 110, comparePrice: 135 },
  'Whole Farm Grocery Kabuli Chana (Medium Size)': { price: 140, comparePrice: 165 },
  'Whole Farm Premium Kashmiri Red Rajma': { price: 175, comparePrice: 200 },

  // Atta, Rice & Dal — Rice
  'Daawat Pulav Basmati Rice (Slender Grains)': { price: 290, comparePrice: 340 },
  'Daawat Rozana Super Basmati Rice': { price: 320, comparePrice: 370 },
  'India Gate Kolam Rice': { price: 210, comparePrice: 250 },

  // Atta, Rice & Dal — Toor, Urad & Chana
  'Organic Tattva Organic Urad Dal (Dhuli)': { price: 165, comparePrice: 195 },
  'Tata Sampann Unpolished Kali Urad (Sabut)': { price: 150, comparePrice: 175 },
  'Whole Farm Grocery Gram  Chana Dal': { price: 130, comparePrice: 155 },

  // Bakery & Biscuits — Bread & Pav
  'Kwality Kreamy Magic Cream Bread Roll': { price: 35, comparePrice: 42 },
  'Kwality Whole Wheat Bread': { price: 45, comparePrice: 55 },
  "The Baker's Dozen 100% Butter Croissant": { price: 120, comparePrice: 145 },

  // Bakery & Biscuits — Cookies
  'Cadbury Chocobakes Choco Chip Cookies': { price: 99, comparePrice: 120 },
  "Let's Try Ragi Kaju Pista Cookies": { price: 130, comparePrice: 155 },
  'Parle Milano Chocolate Chip Biscuit': { price: 60, comparePrice: 75 },
  'RiteBite Max Protein Choco Chips Cookie': { price: 150, comparePrice: 175 },

  // Bakery & Biscuits — Cream Biscuits
  'Cadbury Oreo Original Vanilla Sandwich Cream Biscuits 481.25 g - Jumbo Pack': { price: 130, comparePrice: 155 },
  'Sunfeast Dark Fantasy Choco Creme Center Filled Biscuits (3 x 83 g)': { price: 90, comparePrice: 108 },
  'Sunfeast Dark Fantasy Desserts Choco Chunks Cookies': { price: 75, comparePrice: 90 },

  // Bakery & Biscuits — Glucose & Marie
  'Britannia Marie Gold Marie Biscuits': { price: 40, comparePrice: 50 },
  'Parle-G Glucose Biscuit - Pack of 2': { price: 20, comparePrice: 25 },
  'Parle-G Gold Biscuit - Pack of 2': { price: 30, comparePrice: 38 },

  // Bakery & Biscuits — Healthy & Digestive
  'Britannia NutriChoice Digestive Zero Biscuit': { price: 60, comparePrice: 72 },
  'Britannia NutriChoice Seeds Biscuit': { price: 55, comparePrice: 68 },
  'Britannia NutriChoice Sugar Free Healthy & Digestive Cracker': { price: 65, comparePrice: 78 },

  // Bakery & Biscuits — Sweet & Salty
  'Britannia 5050 Maska Chaska Sweet & Salty Biscuits': { price: 40, comparePrice: 50 },
  'Britannia Little Hearts Classic Biscuit': { price: 35, comparePrice: 44 },
  'Patanjali Whole Wheat Nariyal Biscuit': { price: 30, comparePrice: 38 },
};

// ─── Category default prices (fallback) ──────────────────────────────────────
const CATEGORY_DEFAULT_PRICE: Record<string, { price: number; comparePrice: number }> = {
  'Atta, Rice & Dal': { price: 150, comparePrice: 180 },
  'Bakery & Biscuits': { price: 60, comparePrice: 75 },
  'Cleaning Essentials': { price: 120, comparePrice: 150 },
  'Cold Drinks & Juices': { price: 80, comparePrice: 100 },
  'Dairy, Bread & Eggs': { price: 70, comparePrice: 88 },
  'Fruits & Vegetables': { price: 50, comparePrice: 65 },
  'Masala, Oil & More': { price: 200, comparePrice: 240 },
  'Pharma & Wellness': { price: 150, comparePrice: 180 },
  'Sauces & Spreads': { price: 90, comparePrice: 110 },
  'Snacks & Munchies': { price: 60, comparePrice: 75 },
  'Sweet Tooth': { price: 120, comparePrice: 145 },
  'Tea, Coffee & Health Drink': { price: 250, comparePrice: 300 },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Strip RTF control words and extract plain text lines. */
function parseRtf(rtfContent: string): string {
  // Remove RTF header groups like {\fonttbl...} {\colortbl...} etc.
  let text = rtfContent.replace(/\{[^{}]*\}/g, '');
  // Remove control words like \rtf1 \ansi \pard \f0 \fs22 etc.
  text = text.replace(/\\[a-zA-Z]+[-]?\d*/g, '');
  // Remove remaining braces
  text = text.replace(/[{}]/g, '');
  // Replace \par with newline
  text = text.replace(/\\par/gi, '\n');
  // Remove other backslash sequences
  text = text.replace(/\\\S*/g, '');
  // Normalize whitespace
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Remove null bytes
  text = text.replace(/\0/g, '');
  return text;
}

interface ParsedProductDetails {
  shortDescription: string;
  description: string;
  unit: string;
  shelfLife: string;
  countryOfOrigin: string;
  fssaiLicense: string;
  tags: string[];
}

function extractProductDetails(rtfContent: string): ParsedProductDetails {
  const plain = parseRtf(rtfContent);
  const lines = plain.split('\n').map(l => l.trim()).filter(Boolean);

  const getValue = (label: string): string => {
    const idx = lines.findIndex(l => l.toLowerCase() === label.toLowerCase());
    if (idx === -1) return '';
    // Value is on the next non-empty line
    for (let i = idx + 1; i < lines.length; i++) {
      if (lines[i]) return lines[i];
    }
    return '';
  };

  const getBlock = (startLabel: string, endLabels: string[]): string[] => {
    const startIdx = lines.findIndex(l => l.toLowerCase() === startLabel.toLowerCase());
    if (startIdx === -1) return [];
    const block: string[] = [];
    for (let i = startIdx + 1; i < lines.length; i++) {
      if (endLabels.some(el => lines[i].toLowerCase() === el.toLowerCase())) break;
      if (lines[i]) block.push(lines[i]);
    }
    return block;
  };

  const knownLabels = [
    'type', 'key features', 'unit', 'shelf life', 'manufacturer details',
    'marketed by', 'country of origin', 'fssai license', 'customer care details',
    'return policy', 'expiry date', 'packaging type', 'seller', 'seller fssai',
    'description', 'disclaimer', 'product details',
  ];

  const unit = getValue('unit');
  const shelfLife = getValue('shelf life');
  const countryOfOrigin = getValue('country of origin');
  const fssaiLicense = getValue('fssai license');

  // Build description from "Key Features" block or "Description" block
  const keyFeatures = getBlock('key features', knownLabels);
  const descBlock = getBlock('description', knownLabels);
  const descLines = keyFeatures.length > 0 ? keyFeatures : descBlock;
  const description = descLines.join('. ') || 'Premium quality product.';

  // Short description: first non-header line after "Product Details"
  const pdIdx = lines.findIndex(l => l === 'Product Details');
  let shortDescription = '';
  if (pdIdx !== -1) {
    for (let i = pdIdx + 1; i < lines.length; i++) {
      const candidate = lines[i];
      if (candidate && !knownLabels.includes(candidate.toLowerCase())) {
        shortDescription = candidate;
        break;
      }
    }
  }

  const tags: string[] = [];
  if (unit) tags.push(`unit-${unit.toLowerCase().replace(/\s+/g, '-')}`);
  if (shelfLife) tags.push(`shelf-life-${shelfLife.toLowerCase().replace(/\s+/g, '-')}`);
  if (countryOfOrigin) tags.push(`origin-${countryOfOrigin.toLowerCase().replace(/\s+/g, '-')}`);

  return { shortDescription, description, unit, shelfLife, countryOfOrigin, fssaiLicense, tags };
}

function sanitizeCloudinaryPath(name: string): string {
  return name
    .replace(/&/g, 'and')
    .replace(/,/g, '')
    .replace(/[^a-zA-Z0-9\s\-_]/g, '')
    .trim();
}

function getPricing(productName: string, categoryName: string) {
  return (
    PRICE_MAP[productName] ||
    CATEGORY_DEFAULT_PRICE[categoryName] ||
    { price: 99, comparePrice: 120 }
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function run() {
  await connectDB();

  if (!fs.existsSync(PRODUCT_ROOT)) {
    console.error(`❌ Product directory not found: ${PRODUCT_ROOT}`);
    process.exit(1);
  }

  console.log(`\n🚀 Starting product seeder from: ${PRODUCT_ROOT}\n`);

  let totalCategories = 0;
  let totalSubCategories = 0;
  let totalProducts = 0;
  let totalImages = 0;

  const categoryFolders = fs.readdirSync(PRODUCT_ROOT).filter(d =>
    fs.statSync(path.join(PRODUCT_ROOT, d)).isDirectory()
  );

  for (const catName of categoryFolders) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📁 CATEGORY: ${catName}`);
    console.log('═'.repeat(60));

    const catSlug = slugify(catName);
    let parentCat = await Category.findOne({ slug: catSlug });
    if (!parentCat) {
      parentCat = await Category.create({
        name: catName,
        slug: catSlug,
        sortOrder: 10,
        isActive: true,
      });
      console.log(`  ✨ Created parent category: ${catName}`);
    } else {
      console.log(`  ✔  Found parent category: ${catName}`);
    }
    totalCategories++;

    const catPath = path.join(PRODUCT_ROOT, catName);
    const subCatFolders = fs.readdirSync(catPath).filter(d =>
      fs.statSync(path.join(catPath, d)).isDirectory()
    );

    for (const subCatName of subCatFolders) {
      console.log(`\n  📂 Sub-category: ${subCatName}`);
      const subCatSlug = slugify(`${catName}-${subCatName}`);
      let subCat = await Category.findOne({ slug: subCatSlug });
      if (!subCat) {
        subCat = await Category.create({
          name: subCatName,
          slug: subCatSlug,
          parent: parentCat._id,
          sortOrder: 20,
          isActive: true,
        });
        console.log(`     ✨ Created sub-category: ${subCatName}`);
      } else {
        console.log(`     ✔  Found sub-category: ${subCatName}`);
      }
      totalSubCategories++;

      const subCatPath = path.join(catPath, subCatName);
      const productFolders = fs.readdirSync(subCatPath).filter(d =>
        fs.statSync(path.join(subCatPath, d)).isDirectory()
      );

      for (const prodName of productFolders) {
        console.log(`\n     📦 Product: ${prodName}`);
        const prodPath = path.join(subCatPath, prodName);

        // ── Parse RTF ──
        const rtfPath = path.join(prodPath, 'product details.rtf');
        let details: ParsedProductDetails = {
          shortDescription: '',
          description: `${prodName} — premium quality product.`,
          unit: '',
          shelfLife: '',
          countryOfOrigin: 'India',
          fssaiLicense: '',
          tags: [],
        };
        if (fs.existsSync(rtfPath)) {
          try {
            const rtfContent = fs.readFileSync(rtfPath, 'latin1');
            details = extractProductDetails(rtfContent);
            console.log(`        📄 RTF parsed — Unit: ${details.unit || 'N/A'}, Shelf Life: ${details.shelfLife || 'N/A'}`);
          } catch (e: any) {
            console.warn(`        ⚠️  Could not parse RTF: ${e.message}`);
          }
        } else {
          console.warn(`        ⚠️  No product details.rtf found`);
        }

        // ── Collect images ──
        const allFiles = fs.readdirSync(prodPath);
        const imageFiles = allFiles.filter(f => {
          const ext = path.extname(f).toLowerCase();
          return SUPPORTED_IMG_EXTS.has(ext) && fs.statSync(path.join(prodPath, f)).isFile();
        });

        if (imageFiles.length === 0) {
          console.warn(`        ⚠️  No images found, skipping product`);
          continue;
        }

        // ── Upload images to Cloudinary ──
        const cloudFolder = `Blipzo/${sanitizeCloudinaryPath(catName)}/${sanitizeCloudinaryPath(subCatName)}/${sanitizeCloudinaryPath(prodName)}`;
        const uploadedImages: { url: string; publicId: string; altText: string; isPrimary: boolean; sortOrder: number }[] = [];

        // Determine which image is primary (matches product folder name)
        const primaryFileName = `${prodName}.jpg`;
        const primaryFileNamePng = `${prodName}.png`;

        for (let i = 0; i < imageFiles.length; i++) {
          const fileName = imageFiles[i];
          const filePath = path.join(prodPath, fileName);

          const isPrimary =
            fileName === primaryFileName ||
            fileName === primaryFileNamePng ||
            (uploadedImages.length === 0 && i === imageFiles.length - 1); // fallback: last image if none matched

          // Check if already uploaded
          let imageUrl = '';
          const existingMedia = await Media.findOne({ fileName, folder: cloudFolder });

          let imagePublicId = '';
          if (existingMedia) {
            console.log(`        ⏭  Already uploaded: ${fileName}`);
            imageUrl = existingMedia.url;
            imagePublicId = existingMedia.publicId;
          } else {
            try {
              console.log(`        📤 Uploading: ${fileName}...`);
              const result = await cloudinary.uploader.upload(filePath, {
                folder: cloudFolder,
                resource_type: 'image',
              });
              imageUrl = result.secure_url;
              imagePublicId = result.public_id;
              totalImages++;
              console.log(`        ✅ Uploaded: ${result.secure_url}`);
            } catch (err: any) {
              console.error(`        ❌ Upload failed for ${fileName}: ${err.message}`);
              continue;
            }
          }

          uploadedImages.push({
            url: imageUrl,
            publicId: imagePublicId,
            altText: prodName,
            isPrimary,
            sortOrder: i,
          });
        }

        if (uploadedImages.length === 0) {
          console.warn(`        ⚠️  No images uploaded, skipping product`);
          continue;
        }

        // Ensure exactly one primary
        const hasPrimary = uploadedImages.some(img => img.isPrimary);
        if (!hasPrimary) uploadedImages[0].isPrimary = true;

        // ── Upsert Product in MongoDB ──
        const { price, comparePrice } = getPricing(prodName, catName);
        const prodSlug = slugify(prodName);

        const productData = {
          name: prodName,
          description: details.description || `${prodName} — premium quality product.`,
          shortDescription: details.shortDescription || prodName,
          price,
          comparePrice,
          category: subCat._id,
          tags: [...details.tags, catName.toLowerCase(), subCatName.toLowerCase()],
          images: uploadedImages,
          isActive: true,
          isFeatured: false,
          inventory: 100,
          lowStockThreshold: 5,
        };

        try {
          const existing = await Product.findOne({ slug: prodSlug });
          if (existing) {
            // Update images and details, preserve slug/SKU
            existing.description = productData.description;
            existing.shortDescription = productData.shortDescription;
            existing.price = productData.price;
            existing.comparePrice = productData.comparePrice;
            existing.category = productData.category as mongoose.Types.ObjectId;
            existing.tags = productData.tags;
            existing.images = productData.images;
            existing.isActive = true;
            await existing.save();
            console.log(`        🔄 Updated existing product in DB`);
          } else {
            const created = await Product.create({
              ...productData,
              slug: prodSlug,
            });

            // Save media records with associatedId
            for (let mi = 0; mi < uploadedImages.length; mi++) {
              const img = uploadedImages[mi];
              if (!img.publicId) continue; // already existed in Media collection
              const already = await Media.findOne({ publicId: img.publicId });
              if (!already) {
                await Media.create({
                  url: img.url,
                  publicId: img.publicId,
                  folder: cloudFolder,
                  fileName: imageFiles[mi] || '',
                  associatedType: 'product',
                  associatedId: created._id as mongoose.Types.ObjectId,
                  resourceType: 'image',
                });
              }
            }
            console.log(`        ✨ Created product in DB (₹${price})`);
          }
          totalProducts++;
        } catch (err: any) {
          console.error(`        ❌ DB error for ${prodName}: ${err.message}`);
        }
      }
    }
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log('🎉 Seeding complete!');
  console.log(`   Parent categories : ${totalCategories}`);
  console.log(`   Sub-categories    : ${totalSubCategories}`);
  console.log(`   Products seeded   : ${totalProducts}`);
  console.log(`   Images uploaded   : ${totalImages}`);
  console.log('═'.repeat(60));

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
