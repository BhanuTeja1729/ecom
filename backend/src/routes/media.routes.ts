import { Router } from 'express';
import { uploadMiddleware, uploadMedia, deleteMedia } from '../controllers/media.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// Only admin users can upload or delete media assets
router.post('/upload', authenticate, requireAdmin, uploadMiddleware, uploadMedia);
router.post('/delete', authenticate, requireAdmin, deleteMedia);

export default router;
