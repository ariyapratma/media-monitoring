import { Router } from 'express';
import { searchMentionsController } from '../controllers/mentionsController';

const router = Router();

router.get('/mentions', searchMentionsController);

export default router;
