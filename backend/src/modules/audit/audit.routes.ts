import { Router } from 'express';

import {
  requireAuth,
  requireAdmin,
} from '../../middleware/auth.js';

import { AuditLog } from '../../models/AuditLog.js';

const router = Router();

/**
 * GET /audit
 *
 * Admin-only audit log.
 * Returns the latest 300 audit records.
 */
router.get(
  '/',
  requireAuth,
  requireAdmin,
  async (_req, res) => {
    try {
      const logs = await AuditLog.find()
        .sort({ createdAt: -1 })
        .limit(300)
        .lean();

      return res.json({
        logs,
        count: logs.length,
      });
    } catch (error) {
      console.error(
        'Get audit logs error:',
        error
      );

      return res.status(500).json({
        message: 'Could not load audit logs',
      });
    }
  }
);

export default router;