import { Router } from 'express';
import { getDirections } from '../controllers/route.controller';

const router = Router();

router.get('/directions', getDirections);

export default router;
