/**
 * migrate-all-images.ts
 * Run: npm run migrate:all-images
 *
 * Scans frontend/public/img/ recursively:
 *  - Root PNGs       → upsert as top-level categories (sortOrder 1-20)
 *  - category/<Parent>/<Sub>.* → upsert as sub-categories under that parent
 *
 * All images stored as base64 data URIs directly in MongoDB.
 * Safe to re-run — uses upsert so no duplicates.
 */
import '../config/env';
import * as fs   from 'fs';
import * as path from 'path';
import mongoose  from 'mongoose';
import { connectDB } from '../config/db';
import { Category }  from '../models/Category';

// ─── Paths ───────────────────────────────────────────────────────────────────
const IMG_ROOT    = path.resolve(process.cwd(), '..', 'frontend', 'public', 'img');
const CAT_SUB_DIR = path.join(IMG_ROOT, 'category');

// ─── Helpers ─────────────────────────────────────────────────────────────────
const SUPPORTED = new Set(['.png', '.jpg', '.jpeg', '.webp']);

function mimeOf(ext: string): string {
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  return 'image/png';
}

function toDataUri(filePath: string): string {
  const ext  = path.extname(filePath).toLowerCase();
  const b64  = fs.readFileSync(filePath).toString('base64');
  return `data:${mimeOf(ext)};base64,${b64}`;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[&]/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ─── Top-level category sort order (matches existing seed order) ─────────────
const ROOT_ORDER: Record<string, number> = {
  'fruits-and-vegetables':    1,
  'dairy-bread-and-eggs':     2,
  'atta-rice-and-dal':        3,
  'masala-oil-and-more':      4,
  'snacks-and-munchies':      5,
  'cold-drinks-and-juices':   6,
  'tea-coffe-and-health-drink': 7,
  'tea-coffee-and-health-drink': 7,
  'breakfast-and-instant-food': 8,
  'bakery-and-biscuits':      9,
  'sauces-and-spreads':      10,
  'chicken-meat-and-fish':   11,
  'organic-and-healthy-living': 12,
  'sweet-tooth':             13,
  'personal-care':           14,
  'baby-care':               15,
  'pet-care':                16,
  'cleaning-essentials':     17,
  'home-and-office':         18,
  'pharma-and-wellness':     19,
  'paan-corner':             20,
};

// ─── Main ────────────────────────────────────────────────────────────────────
async function run() {
  await connectDB();
  console.log('\n📸  Migrating all images → MongoDB');
  console.log(`📁  Root : ${IMG_ROOT}\n`);

  let totalOk = 0, totalErr = 0;

  // ── 1. Root-level PNGs → top-level categories ─────────────────────────────
  console.log('══════════════════════════════════════════════════');
  console.log(' STEP 1 — Top-level categories (root *.png)');
  console.log('══════════════════════════════════════════════════');

  const rootFiles = fs.readdirSync(IMG_ROOT).filter(f => {
    const ext = path.extname(f).toLowerCase();
    return SUPPORTED.has(ext) && fs.statSync(path.join(IMG_ROOT, f)).isFile();
  });

  const parentIdMap = new Map<string, mongoose.Types.ObjectId>(); // parentName → _id

  for (const [i, file] of rootFiles.entries()) {
    const fullPath  = path.join(IMG_ROOT, file);
    const nameNoExt = path.basename(file, path.extname(file));
    const slug      = slugify(nameNoExt);
    const imageUrl  = toDataUri(fullPath);
    const sizeKb    = Math.round(imageUrl.length / 1024);
    const order     = ROOT_ORDER[slug] ?? (100 + i);

    try {
      const doc = await Category.findOneAndUpdate(
        { slug },
        { $set: { name: nameNoExt, slug, imageUrl, sortOrder: order, isActive: true } },
        { upsert: true, new: true }
      );
      parentIdMap.set(nameNoExt, doc._id as mongoose.Types.ObjectId);
      console.log(`  ✅ [${String(order).padStart(2,'0')}] ${nameNoExt.padEnd(36)} ${sizeKb} KB`);
      totalOk++;
    } catch (err: any) {
      console.error(`  ❌ ${nameNoExt}: ${err.message}`);
      totalErr++;
    }
  }

  // ── 2. Subcategory images → child categories ──────────────────────────────
  if (!fs.existsSync(CAT_SUB_DIR)) {
    console.log('\n⚠️  No category/ subfolder found — skipping subcategories.\n');
  } else {
    const parentFolders = fs.readdirSync(CAT_SUB_DIR).filter(d =>
      fs.statSync(path.join(CAT_SUB_DIR, d)).isDirectory()
    );

    for (const parentName of parentFolders) {
      console.log(`\n══════════════════════════════════════════════════`);
      console.log(` STEP 2 — Subcategories of "${parentName}"`);
      console.log(`══════════════════════════════════════════════════`);

      const parentSlug = slugify(parentName);

      // Find or create the parent doc to get its _id
      let parentDoc = await Category.findOne({ slug: parentSlug });
      if (!parentDoc) {
        // Parent not yet created from root PNGs — create it without image
        parentDoc = await Category.findOneAndUpdate(
          { slug: parentSlug },
          { $set: { name: parentName, slug: parentSlug, sortOrder: 99, isActive: true } },
          { upsert: true, new: true }
        );
        console.log(`  📂 Parent created (no image): ${parentName}`);
      }
      const parentId = parentDoc!._id as mongoose.Types.ObjectId;

      const subDir = path.join(CAT_SUB_DIR, parentName);
      const subFiles = fs.readdirSync(subDir).filter(f => {
        const ext = path.extname(f).toLowerCase();
        return SUPPORTED.has(ext) && fs.statSync(path.join(subDir, f)).isFile();
      });

      for (const [idx, file] of subFiles.entries()) {
        const fullPath  = path.join(subDir, file);
        const nameNoExt = path.basename(file, path.extname(file));
        const slug      = slugify(`${parentSlug}-${nameNoExt}`);
        const imageUrl  = toDataUri(fullPath);
        const sizeKb    = Math.round(imageUrl.length / 1024);

        try {
          await Category.findOneAndUpdate(
            { slug },
            {
              $set: {
                name:      nameNoExt,
                slug,
                imageUrl,
                parent:    parentId,
                sortOrder: idx + 1,
                isActive:  true,
              },
            },
            { upsert: true, new: true }
          );
          console.log(`  ✅ ${nameNoExt.padEnd(40)} ${sizeKb} KB`);
          totalOk++;
        } catch (err: any) {
          console.error(`  ❌ ${nameNoExt}: ${err.message}`);
          totalErr++;
        }
      }
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const total = await Category.countDocuments();
  console.log('\n══════════════════════════════════════════════════');
  console.log(`✅  Uploaded  : ${totalOk} images`);
  if (totalErr) console.log(`❌  Errors    : ${totalErr}`);
  console.log(`📦  Total categories in MongoDB: ${total}`);
  console.log('══════════════════════════════════════════════════\n');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('\n❌ Migration failed:', err.message);
  process.exit(1);
});
