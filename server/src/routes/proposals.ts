import { Router, Response } from 'express';
import { authenticate, restrictTo, AuthenticatedRequest } from '../middleware/auth.js';
import { Proposal } from '../models/Proposal.js';
import { getIO } from '../sockets/socket.js';

const router = Router();

const PROPOSAL_STATUSES = ['DRAFT', 'GENERATED', 'SENT', 'APPROVED', 'REJECTED', 'EXPIRED'];

/**
 * Updates a proposal's status. Approved/Rejected outcomes feed the adaptive
 * pricing engine so future quotes adapt to win/loss history.
 */
router.patch(
  '/:proposalId/status',
  authenticate,
  restrictTo('admin', 'executive'),
  async (req: AuthenticatedRequest, res: Response) => {
    const { proposalId } = req.params;
    const { status } = req.body;

    if (!PROPOSAL_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${PROPOSAL_STATUSES.join(', ')}.`
      });
    }

    try {
      const proposal = await Proposal.findByIdAndUpdate(
        proposalId,
        { status },
        { new: true }
      );

      if (!proposal) {
        return res.status(404).json({ success: false, message: 'Proposal not found.' });
      }

      // Notify executives over socket
      try {
        getIO().to('executives').emit('proposal:updated', proposal);
      } catch (e) {}

      return res.json({ success: true, proposal });
    } catch (error: any) {
      console.error('[Proposals] Status update error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  }
);

export default router;
