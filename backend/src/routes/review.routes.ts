import { Router } from 'express';
import { getReviews, createReview, deleteReview } from '../controllers/review.controller';
import { authenticate } from '../middleware/auth';

const router = Router({ mergeParams: true });

router.get('/', getReviews);
router.post('/', authenticate, createReview);
router.delete('/:id', authenticate, deleteReview);

export default router;
