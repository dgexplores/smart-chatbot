import { Router, Response } from 'express';
import { authenticate, restrictTo, AuthenticatedRequest } from '../middleware/auth.js';
import { PricingConfig } from '../models/PricingConfig.js';
import { getActiveRates, recomputeMultipliers } from '../services/pricing.js';

const router = Router();

/**
 * Returns the current active rate card, including the version and when it
 * last changed, so pricing updates over time are visible.
 */
router.get(
  '/rates',
  authenticate,
  restrictTo('admin', 'executive'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const configDoc = await PricingConfig.findOne({ isActive: true });
      const rates = await getActiveRates();
      return res.json({
        success: true,
        data: {
          version: rates.version,
          rates: rates.rates,
          effectiveFrom: configDoc?.effectiveFrom ?? null,
          updatedAt: configDoc?.updatedAt ?? null
        }
      });
    } catch (error: any) {
      console.error('[Pricing] Get rates error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  }
);

/**
 * Manually triggers the adaptive recompute now instead of waiting for the
 * scheduled job. Returns the resulting rate card.
 */
router.post(
  '/recompute',
  authenticate,
  restrictTo('admin', 'executive'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await recomputeMultipliers();
      const rates = await getActiveRates();
      const configDoc = await PricingConfig.findOne({ isActive: true });
      return res.json({
        success: true,
        data: {
          version: rates.version,
          rates: rates.rates,
          effectiveFrom: configDoc?.effectiveFrom ?? null,
          updatedAt: configDoc?.updatedAt ?? null
        }
      });
    } catch (error: any) {
      console.error('[Pricing] Recompute error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  }
);

export default router;
