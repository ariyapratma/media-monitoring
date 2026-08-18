import { Router } from 'express';
import { getStatsController } from '../controllers/statsController';

const router = Router();

router.get('/mentions/stats', getStatsController);

export default router;
