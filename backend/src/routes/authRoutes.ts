import { Router } from 'express';
import {
  login,
  register,
  getMe,
  updateBankDetails,
  loginSchema,
  registerSchema,
  updateBankSchema,
} from '../controllers/authController';
import { authenticate } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validate';

const router = Router();

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: User Login (Author or Admin)
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post('/login', validateRequest({ body: loginSchema }), login);

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register a new author or admin account
 *     tags: [Authentication]
 *     security: []
 */
router.post('/register', validateRequest({ body: registerSchema }), register);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Retrieve currently authenticated user profile
 *     tags: [Authentication]
 */
router.get('/me', authenticate, getMe);

/**
 * @openapi
 * /auth/bank-details:
 *   patch:
 *     summary: Link or update bank account details for royalty disbursements
 *     tags: [Authentication]
 */
router.patch('/bank-details', authenticate, validateRequest({ body: updateBankSchema }), updateBankDetails);

export default router;
