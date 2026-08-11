import { Router, Response } from 'express';
import { authenticate, restrictTo, AuthenticatedRequest } from '../middleware/auth.js';
import { MarketTarget } from '../models/MarketTarget.js';
import { scanDueTargets } from '../services/marketScanner.js';

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

/** Lists all market scan targets. */
router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const targets = await MarketTarget.find().sort({ createdAt: -1 });
    return res.json({ success: true, data: targets });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

/** Creates a market scan target (a competitor pricing page). */
router.post('/', authenticate, restrictTo('admin', 'executive'), async (req: AuthenticatedRequest, res: Response) => {
  const { service, competitor, url, intervalHours, enabled } = req.body;

  if (!SERVICE_KEYS.includes(service)) {
    return res.status(400).json({
      success: false,
      message: `service must be one of: ${SERVICE_KEYS.join(', ')}.`
    });
  }
  if (!competitor || typeof competitor !== 'string' || !competitor.trim()) {
    return res.status(400).json({ success: false, message: 'competitor is required.' });
  }
  try {
    new URL(url);
  } catch {
    return res.status(400).json({ success: false, message: 'url must be a valid URL.' });
  }

  try {
    const target = await MarketTarget.create({
      service,
      competitor: competitor.trim(),
      url,
      intervalHours: intervalHours ?? 168,
      enabled: enabled ?? true
    });
    return res.status(201).json({ success: true, data: target });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

/** Updates a market scan target. */
router.patch('/:id', authenticate, restrictTo('admin', 'executive'), async (req: AuthenticatedRequest, res: Response) => {
  const { service, competitor, url, intervalHours, enabled } = req.body;

  try {
    const target = await MarketTarget.findByIdAndUpdate(
      req.params.id,
      {
        ...(service ? { service } : {}),
        ...(competitor ? { competitor: competitor.trim() } : {}),
        ...(url ? { url } : {}),
        ...(intervalHours !== undefined ? { intervalHours } : {}),
        ...(enabled !== undefined ? { enabled } : {})
      },
      { new: true }
    );

    if (!target) {
      return res.status(404).json({ success: false, message: 'Target not found.' });
    }
    return res.json({ success: true, data: target });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

/** Deletes a market scan target. */
router.delete('/:id', authenticate, restrictTo('admin', 'executive'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const target = await MarketTarget.findByIdAndDelete(req.params.id);
    if (!target) {
      return res.status(404).json({ success: false, message: 'Target not found.' });
    }
    return res.json({ success: true, message: 'Target deleted.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

/** Triggers an immediate scan of all enabled targets. */
router.post('/scan', authenticate, restrictTo('admin', 'executive'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const scanned = await scanDueTargets();
    return res.json({ success: true, scanned });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

export default router;
