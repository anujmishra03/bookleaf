import { Request, Response, NextFunction } from 'express';
import { PrismaClient, Role, ProductionStage } from '@prisma/client';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

export const updateBookStatusSchema = z.object({
  status: z.nativeEnum(ProductionStage),
  isbn: z.string().optional(),
});

export const getBooks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;
    const authorIdQuery = req.query.authorId as string | undefined;

    let whereClause: any = {};

    if (user.role === Role.AUTHOR) {
      whereClause.authorId = user.id;
    } else if (authorIdQuery) {
      whereClause.authorId = authorIdQuery;
    }

    const books = await prisma.book.findMany({
      where: whereClause,
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const summary = books.reduce(
      (acc, b) => {
        acc.totalBooks += 1;
        acc.totalCopiesSold += b.totalCopiesSold;
        acc.totalRoyaltyEarned += b.totalRoyaltyEarned;
        acc.royaltyPaid += b.royaltyPaid;
        acc.royaltyPending += b.royaltyPending;
        if (b.status === ProductionStage.PUBLISHED_LIVE) {
          acc.publishedLiveCount += 1;
        } else {
          acc.inProductionCount += 1;
        }
        return acc;
      },
      {
        totalBooks: 0,
        publishedLiveCount: 0,
        inProductionCount: 0,
        totalCopiesSold: 0,
        totalRoyaltyEarned: 0,
        royaltyPaid: 0,
        royaltyPending: 0,
      }
    );

    const formattedBooks = books.map((b) => ({
      ...b,
      platformSales: b.platformSalesJson ? JSON.parse(b.platformSalesJson) : null,
    }));

    res.status(200).json({
      success: true,
      data: {
        books: formattedBooks,
        summary,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getBookById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;
    const id = req.params.id as string;

    const book = await prisma.book.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, name: true, email: true, phone: true, bankAccountLinked: true },
        },
        tickets: {
          select: { id: true, ticketNumber: true, subject: true, status: true, priority: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!book) {
      throw new AppError('Book not found', 404, 'NOT_FOUND');
    }

    if (user.role === Role.AUTHOR && book.authorId !== user.id) {
      throw new AppError('Forbidden: You can only access books registered to your account', 403, 'FORBIDDEN');
    }

    res.status(200).json({
      success: true,
      data: {
        ...book,
        platformSales: book.platformSalesJson ? JSON.parse(book.platformSalesJson) : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateBookStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { status, isbn } = req.body;

    const book = await prisma.book.findUnique({ where: { id } });
    if (!book) {
      throw new AppError('Book not found', 404, 'NOT_FOUND');
    }

    const updated = await prisma.book.update({
      where: { id },
      data: {
        status,
        ...(isbn ? { isbn } : {}),
        ...(status === ProductionStage.PUBLISHED_LIVE && !book.publicationDate ? { publicationDate: new Date() } : {}),
      },
    });

    res.status(200).json({
      success: true,
      message: `Book status updated to ${status}`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};
