import { Router } from 'express';
import { createOrder, getOrders, getOrder, updateOrderStatus, cancelOrder, requestReturn } from '../controllers/order.controller';
import { authenticate, optionalAuth, requireAdmin } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, createOrder);
router.get('/', authenticate, getOrders);
router.get('/:orderNumber', authenticate, getOrder);
router.put('/:id/status', authenticate, requireAdmin, updateOrderStatus);
router.put('/:orderNumber/cancel', authenticate, cancelOrder);
router.put('/:orderNumber/return', authenticate, requestReturn);

export default router;
