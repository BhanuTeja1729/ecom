import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import cloudinary from '../config/cloudinary';
import { Media } from '../models/Media';
import { Category } from '../models/Category';
import { createError } from '../middleware/error';

// Config multer to store file in memory
const storage = multer.memoryStorage();
export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
}).single('file');

function sanitizeCloudinaryPath(name: string): string {
  return name
    .replace(/&/g, 'and')
    .replace(/,/g, '')
    .replace(/[^a-zA-Z0-9\s\-_]/g, '')
    .trim();
}

/**
 * Resolve the full Cloudinary folder path for a category.
 * If the category has a parent, path is: Blipzo/<Parent>/<Child>
 * Otherwise: Blipzo/<Category>
 */
async function resolveCategoryFolderPath(categoryId: string): Promise<string> {
  const cat = await Category.findById(categoryId).lean() as any;
  if (!cat) throw createError('Category not found', 404);

  const cleanName = sanitizeCloudinaryPath(cat.name);

  if (cat.parent) {
    const parent = await Category.findById(cat.parent).lean() as any;
    if (parent) {
      const cleanParent = sanitizeCloudinaryPath(parent.name);
      return `Blipzo/${cleanParent}/${cleanName}`;
    }
  }

  return `Blipzo/${cleanName}`;
}

export async function uploadMedia(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) {
      throw createError('No file uploaded', 400);
    }

    const { type, categoryId, categoryName, productName } = req.body;

    if (!type || !['category', 'product'].includes(type)) {
      throw createError('Invalid or missing upload type. Must be category or product.', 400);
    }

    // Determine the Cloudinary folder path
    // Root: Blipzo
    // Category folder: Blipzo/<ParentCategory>/<Category> (or Blipzo/<Category> if no parent)
    // Product folder:  Blipzo/<ParentCategory>/<Category>/<ProductName>
    let folder: string;

    if (categoryId) {
      // Preferred: resolve full hierarchy from the DB
      folder = await resolveCategoryFolderPath(categoryId);
    } else if (categoryName && categoryName.trim()) {
      // Fallback: use raw name (legacy / category uploads)
      folder = `Blipzo/${sanitizeCloudinaryPath(categoryName)}`;
    } else {
      throw createError('categoryId or categoryName is required to determine the folder path.', 400);
    }

    if (type === 'product') {
      if (!productName || !productName.trim()) {
        throw createError('Product name is required for product images.', 400);
      }
      const cleanProductName = sanitizeCloudinaryPath(productName);
      folder = `${folder}/${cleanProductName}`;
    }

    // Convert file buffer to base64 Data URI
    const base64File = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(base64File, {
      folder,
      resource_type: 'auto',
    });

    // Create a record in the Media lookup table
    const media = await Media.create({
      url: result.secure_url,
      publicId: result.public_id,
      folder,
      fileName: req.file.originalname,
      resourceType: result.resource_type,
      format: result.format,
      size: result.bytes,
      width: result.width,
      height: result.height,
      associatedType: type,
    });

    res.status(201).json({
      success: true,
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        folder,
        mediaId: media._id,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteMedia(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { publicId } = req.body;
    if (!publicId) {
      throw createError('publicId is required', 400);
    }

    // Always attempt to delete from Cloudinary — even if no Media record exists
    // (handles seeded images or images uploaded outside the media endpoint)
    const cloudinaryRes = await cloudinary.uploader.destroy(publicId);
    if (cloudinaryRes.result !== 'ok' && cloudinaryRes.result !== 'not found') {
      throw createError(`Cloudinary deletion failed: ${cloudinaryRes.result}`, 500);
    }

    // Best-effort: also clean up the Media lookup record if one exists
    await Media.deleteOne({ publicId });

    res.json({
      success: true,
      message: 'Media deleted successfully from Cloudinary',
    });
  } catch (err) {
    next(err);
  }
}
