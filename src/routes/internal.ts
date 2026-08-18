import { Router } from 'express';
import { bulkIngestController } from '../controllers/internalController';

const router = Router();

router.post('/mentions/bulk', bulkIngestController);

export default router;
