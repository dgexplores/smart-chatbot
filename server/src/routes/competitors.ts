import { Router, Response } from 'express';
import { authenticate, restrictTo, AuthenticatedRequest } from '../middleware/auth.js';
import { CompetitorPrice } from '../models/CompetitorPrice.js';

const router = Router();

const SERVICE_KEYS = [
  'WEB_DEVELOPMENT',
  'UI_UX_DESIGN',
  'MOBILE_APP',
  'SEO',
  'CONTENT',
  'MARKETING',
  'DEFAULT'
];

/**
 * Records a competitor price observation. Over time, these feed the adaptive
 * pricing job so quotes respond to the market (see services/pricing.ts).
 */
router.post(
  '/',
  authenticate,
  restrictTo('admin', 'executive'),
  async (req: AuthenticatedRequest, res: Response) => {
    const { service, competitor, price, capturedAt } = req.body;

    if (!SERVICE_KEYS.includes(service)) {
      return res.status(400).json({
        success: false,
        message: `service must be one of: ${SERVICE_KEYS.join(', ')}.`
      });
    }
    if (!competitor || typeof competitor !== 'string' || !competitor.trim()) {
      return res.status(400).json({ success: false, message: 'competitor is required.' });
    }
    if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
      return res.status(400).json({ success: false, message: 'price must be a positive number.' });
    }

    try {
      const record = await CompetitorPrice.create({
        service,
        competitor: competitor.trim(),
        price,
        capturedAt: capturedAt ? new Date(capturedAt) : new Date()
      });
      return res.status(201).json({ success: true, data: record });
    } catch (error: any) {
      console.error('[Competitors] Create error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  }
);

/**
 * Lists recent competitor price observations, optionally filtered by service.
 */
router.get(
  '/',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const filter = req.query.service ? { service: req.query.service } : {};
      const records = await CompetitorPrice.find(filter)
        .sort({ capturedAt: -1 })
        .limit(100);
      return res.json({ success: true, data: records });
    } catch (error: any) {
      console.error('[Competitors] List error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  }
);

export default router;
