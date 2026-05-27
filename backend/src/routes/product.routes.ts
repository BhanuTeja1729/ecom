import { Router } from 'express';
import {
  getProducts, getProduct, createProduct, updateProduct, deleteProduct, getFeaturedProducts, updateInventory,
} from '../controllers/product.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', getProducts);
router.get('/featured', getFeaturedProducts);
router.get('/:slug', getProduct);
router.post('/', authenticate, requireAdmin, createProduct);
router.put('/:id', authenticate, requireAdmin, updateProduct);
router.patch('/:id/inventory', authenticate, requireAdmin, updateInventory);
router.delete('/:id', authenticate, requireAdmin, deleteProduct);

export default router;
