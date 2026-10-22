import { Router } from 'express';
import { getAdminStats } from '../controllers/statsController';
import { authenticate, requireRole } from '../middleware/authMiddleware';
import { Role } from '@prisma/client';

const router = Router();

/**
 * @openapi
 * /stats/admin:
 *   get:
 *     summary: Ops metrics, SLA indicators and category breakdown (Admin only)
 *     tags: [Analytics]
 */
router.get('/admin', authenticate, requireRole(Role.ADMIN), getAdminStats);

export default router;
