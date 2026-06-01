import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import cloudinary from '../config/cloudinary';
import { Media } from '../models/Media';
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

export async function uploadMedia(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) {
      throw createError('No file uploaded', 400);
    }

    const { type, categoryName, productName } = req.body;

    if (!type || !['category', 'product'].includes(type)) {
      throw createError('Invalid or missing upload type. Must be category or product.', 400);
    }

    if (!categoryName || !categoryName.trim()) {
      throw createError('Category name is required to determine the folder path.', 400);
    }

    // Determine the Cloudinary folder path
    // Root: Blipzo
    // Category folder: Blipzo/<Category Name>
    // Product folder: Blipzo/<Category Name>/<Product Name>
    const cleanCategoryName = sanitizeCloudinaryPath(categoryName);
    let folder = `Blipzo/${cleanCategoryName}`;
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

    const media = await Media.findOne({ publicId });
    if (!media) {
      throw createError('Media record not found in database', 404);
    }

    // Delete from Cloudinary
    const cloudinaryRes = await cloudinary.uploader.destroy(publicId);
    if (cloudinaryRes.result !== 'ok' && cloudinaryRes.result !== 'not found') {
      throw createError(`Cloudinary deletion failed: ${cloudinaryRes.result}`, 500);
    }

    // Delete from MongoDB lookup table
    await Media.deleteOne({ publicId });

    res.json({
      success: true,
      message: 'Media deleted successfully from Cloudinary and database lookup table',
    });
  } catch (err) {
    next(err);
  }
}
