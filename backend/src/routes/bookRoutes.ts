import { Router } from 'express';
import { getBooks, getBookById, updateBookStatus, updateBookStatusSchema } from '../controllers/bookController';
import { authenticate, requireRole } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validate';
import { Role } from '@prisma/client';

const router = Router();

/**
 * @openapi
 * /books:
 *   get:
 *     summary: Get books (Scoped to current author, or all books for admins)
 *     tags: [Books]
 */
router.get('/', authenticate, getBooks);

/**
 * @openapi
 * /books/{id}:
 *   get:
 *     summary: Get book details by ID
 *     tags: [Books]
 */
router.get('/:id', authenticate, getBookById);

/**
 * @openapi
 * /books/{id}/status:
 *   patch:
 *     summary: Update book production stage or ISBN (Admin only)
 *     tags: [Books]
 */
router.patch(
  '/:id/status',
  authenticate,
  requireRole(Role.ADMIN),
  validateRequest({ body: updateBookStatusSchema }),
  updateBookStatus
);

export default router;
