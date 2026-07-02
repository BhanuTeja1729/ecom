import { Router } from 'express';
import { verifyCashfreePayment } from '../controllers/payment.controller';

const router = Router();

router.post('/cashfree/verify', verifyCashfreePayment);

export default router;

