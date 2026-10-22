import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient, Role } from '@prisma/client';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'bookleaf_jwt_secure_secret_key_prod_grade_2026';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  phone: z.string().optional(),
  role: z.enum(['AUTHOR', 'ADMIN']).optional(),
});

export const updateBankSchema = z.object({
  bankName: z.string().min(2, 'Bank name is required'),
  accountNumberLast4: z.string().min(4).max(4, 'Enter last 4 digits of account number'),
  ifsc: z.string().min(4, 'IFSC code is required'),
});

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          phone: user.phone,
          bankAccountLinked: user.bankAccountLinked,
          bankAccountDetails: user.bankAccountDetails ? JSON.parse(user.bankAccountDetails) : null,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password, name, phone, role } = req.body;

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      throw new AppError('An account with this email already exists', 409, 'USER_ALREADY_EXISTS');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const assignedRole = role === 'ADMIN' ? Role.ADMIN : Role.AUTHOR;

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        name,
        phone,
        role: assignedRole,
      },
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Account registered successfully',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          phone: user.phone,
          bankAccountLinked: user.bankAccountLinked,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        bankAccountLinked: true,
        bankAccountDetails: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    res.status(200).json({
      success: true,
      data: {
        ...user,
        bankAccountDetails: user.bankAccountDetails ? JSON.parse(user.bankAccountDetails) : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateBankDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { bankName, accountNumberLast4, ifsc } = req.body;

    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        bankAccountLinked: true,
        bankAccountDetails: JSON.stringify({ bankName, accountNumberLast4, ifsc }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        bankAccountLinked: true,
        bankAccountDetails: true,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Bank account linked successfully for royalty payouts',
      data: {
        ...updated,
        bankAccountDetails: updated.bankAccountDetails ? JSON.parse(updated.bankAccountDetails) : null,
      },
    });
  } catch (error) {
    next(error);
  }
};
