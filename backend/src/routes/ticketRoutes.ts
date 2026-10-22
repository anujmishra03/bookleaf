import { Router } from 'express';
import {
  getTickets,
  getTicketById,
  createTicket,
  replyTicket,
  updateTicketStatus,
  updateTicketPriority,
  updateTicketCategory,
  assignTicket,
  generateAiDraft,
  createTicketSchema,
  replyTicketSchema,
  updateStatusSchema,
  updatePrioritySchema,
  updateCategorySchema,
  assignTicketSchema,
} from '../controllers/ticketController';
import { authenticate, requireRole } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validate';
import { Role } from '@prisma/client';

const router = Router();

/**
 * @openapi
 * /tickets:
 *   get:
 *     summary: List tickets (Scoped for authors; filterable & sortable for admins)
 *     tags: [Tickets]
 */
router.get('/', authenticate, getTickets);

/**
 * @openapi
 * /tickets/{id}:
 *   get:
 *     summary: Retrieve ticket by ID with discussion thread
 *     tags: [Tickets]
 */
router.get('/:id', authenticate, getTicketById);

/**
 * @openapi
 * /tickets:
 *   post:
 *     summary: Submit a new support query (AI-classified and prioritized)
 *     tags: [Tickets]
 */
router.post('/', authenticate, validateRequest({ body: createTicketSchema }), createTicket);

/**
 * @openapi
 * /tickets/{id}/messages:
 *   post:
 *     summary: Post a reply or admin internal note to a ticket
 *     tags: [Tickets]
 */
router.post('/:id/messages', authenticate, validateRequest({ body: replyTicketSchema }), replyTicket);

/**
 * @openapi
 * /tickets/{id}/status:
 *   patch:
 *     summary: Update ticket status (Open, In Progress, Resolved, Closed)
 *     tags: [Tickets]
 */
router.patch('/:id/status', authenticate, validateRequest({ body: updateStatusSchema }), updateTicketStatus);

/**
 * @openapi
 * /tickets/{id}/priority:
 *   patch:
 *     summary: Override AI ticket priority (Admin only)
 *     tags: [Tickets]
 */
router.patch(
  '/:id/priority',
  authenticate,
  requireRole(Role.ADMIN),
  validateRequest({ body: updatePrioritySchema }),
  updateTicketPriority
);

/**
 * @openapi
 * /tickets/{id}/category:
 *   patch:
 *     summary: Override AI ticket classification category (Admin only)
 *     tags: [Tickets]
 */
router.patch(
  '/:id/category',
  authenticate,
  requireRole(Role.ADMIN),
  validateRequest({ body: updateCategorySchema }),
  updateTicketCategory
);

/**
 * @openapi
 * /tickets/{id}/assign:
 *   patch:
 *     summary: Assign ticket to ops admin (Admin only)
 *     tags: [Tickets]
 */
router.patch(
  '/:id/assign',
  authenticate,
  requireRole(Role.ADMIN),
  validateRequest({ body: assignTicketSchema }),
  assignTicket
);

/**
 * @openapi
 * /tickets/{id}/generate-ai-draft:
 *   post:
 *     summary: Regenerate AI drafted response on demand (Admin only)
 *     tags: [Tickets]
 */
router.post('/:id/generate-ai-draft', authenticate, requireRole(Role.ADMIN), generateAiDraft);

export default router;
