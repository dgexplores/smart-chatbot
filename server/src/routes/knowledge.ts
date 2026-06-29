import { Router } from 'express';
import { uploadDocument, getDocuments, deleteDocument } from '../controllers/knowledge.js';
import { authenticate, restrictTo } from '../middleware/auth.js';

const router = Router();

router.post('/upload', authenticate, restrictTo('admin', 'executive'), uploadDocument);
router.get('/', authenticate, getDocuments);
router.delete('/:id', authenticate, restrictTo('admin', 'executive'), deleteDocument);

export default router;
