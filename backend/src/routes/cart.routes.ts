import { Router } from 'express';
import { getCart, addToCart, updateCartItem, clearCart, applyCoupon } from '../controllers/cart.controller';
import { optionalAuth } from '../middleware/auth';

const router = Router();

router.use(optionalAuth);
router.get('/', getCart);
router.post('/items', addToCart);
router.put('/items', updateCartItem);
router.delete('/', clearCart);
router.post('/coupon', applyCoupon);

export default router;
