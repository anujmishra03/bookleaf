import { Request, Response, NextFunction } from 'express';
import { PrismaClient, Role, TicketPriority, TicketStatus } from '@prisma/client';

const prisma = new PrismaClient();

export const getAdminStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [
      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedTickets,
      criticalTickets,
      highPriorityTickets,
      totalAuthors,
      totalBooks,
      admins,
      categoryStats,
      recentTickets,
    ] = await Promise.all([
      prisma.ticket.count(),
      prisma.ticket.count({ where: { status: TicketStatus.OPEN } }),
      prisma.ticket.count({ where: { status: TicketStatus.IN_PROGRESS } }),
      prisma.ticket.count({ where: { status: { in: [TicketStatus.RESOLVED, TicketStatus.CLOSED] } } }),
      prisma.ticket.count({ where: { priority: TicketPriority.CRITICAL } }),
      prisma.ticket.count({ where: { priority: TicketPriority.HIGH } }),
      prisma.user.count({ where: { role: Role.AUTHOR } }),
      prisma.book.count(),
      prisma.user.findMany({
        where: { role: Role.ADMIN },
        select: { id: true, name: true, email: true },
      }),
      prisma.ticket.groupBy({
        by: ['category'],
        _count: { id: true },
      }),
      prisma.ticket.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { name: true, email: true } },
          book: { select: { title: true } },
        },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalTickets,
          openTickets,
          inProgressTickets,
          resolvedTickets,
          unresolvedCount: openTickets + inProgressTickets,
          criticalTickets,
          highPriorityTickets,
          totalAuthors,
          totalBooks,
        },
        categoryBreakdown: categoryStats.map((c) => ({
          category: c.category,
          count: c._count.id,
        })),
        admins,
        recentTickets,
      },
    });
  } catch (error) {
    next(error);
  }
};
