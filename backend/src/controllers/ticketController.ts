import { Request, Response, NextFunction } from 'express';
import { PrismaClient, Role, TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';
import { aiService } from '../services/aiService';
import { socketEvents } from '../sockets/socketHandler';

const prisma = new PrismaClient();

export const createTicketSchema = z.object({
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  bookId: z.string().nullable().optional(),
  attachments: z.array(z.any()).optional(),
});

export const replyTicketSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  isInternalNote: z.boolean().optional().default(false),
  attachments: z.array(z.any()).optional(),
});

export const updateStatusSchema = z.object({
  status: z.nativeEnum(TicketStatus),
});

export const updatePrioritySchema = z.object({
  priority: z.nativeEnum(TicketPriority),
  reason: z.string().optional(),
});

export const updateCategorySchema = z.object({
  category: z.nativeEnum(TicketCategory),
  reason: z.string().optional(),
});

export const assignTicketSchema = z.object({
  adminId: z.string().nullable(),
});

/**
 * List tickets with flexible filtering and urgency-based sorting
 */
export const getTickets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;
    const { status, category, priority, assignedToId, search, sortBy } = req.query as {
      status?: TicketStatus;
      category?: TicketCategory;
      priority?: TicketPriority;
      assignedToId?: string;
      search?: string;
      sortBy?: 'urgent' | 'newest' | 'oldest';
    };

    let whereClause: any = {};

    if (user.role === Role.AUTHOR) {
      whereClause.authorId = user.id;
    } else {
      if (status) whereClause.status = status;
      if (category) whereClause.category = category;
      if (priority) whereClause.priority = priority;
      if (assignedToId === 'unassigned') {
        whereClause.assignedToId = null;
      } else if (assignedToId) {
        whereClause.assignedToId = assignedToId;
      }

      if (search) {
        whereClause.OR = [
          { subject: { contains: search } },
          { description: { contains: search } },
          { ticketNumber: { contains: search } },
          { author: { name: { contains: search } } },
          { author: { email: { contains: search } } },
        ];
      }
    }

    let orderBy: any[] = [{ createdAt: 'desc' }];
    if (user.role === Role.ADMIN) {
      if (sortBy === 'urgent' || !sortBy) {
        orderBy = [
          { status: 'asc' },
          { priority: 'asc' },
          { createdAt: 'asc' },
        ];
      } else if (sortBy === 'newest') {
        orderBy = [{ createdAt: 'desc' }];
      } else if (sortBy === 'oldest') {
        orderBy = [{ createdAt: 'asc' }];
      }
    }

    const tickets = await prisma.ticket.findMany({
      where: whereClause,
      include: {
        author: {
          select: { id: true, name: true, email: true, phone: true, bankAccountLinked: true },
        },
        book: {
          select: { id: true, title: true, isbn: true, status: true, totalCopiesSold: true, royaltyPending: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy,
    });

    res.status(200).json({
      success: true,
      data: tickets,
      meta: {
        total: tickets.length,
        openCount: tickets.filter((t) => t.status === TicketStatus.OPEN).length,
        inProgressCount: tickets.filter((t) => t.status === TicketStatus.IN_PROGRESS).length,
        criticalCount: tickets.filter((t) => t.priority === TicketPriority.CRITICAL).length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get ticket details by ID with message history
 */
export const getTicketById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;
    const id = req.params.id as string;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            bankAccountLinked: true,
            bankAccountDetails: true,
          },
        },
        book: true,
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        messages: {
          include: {
            sender: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        auditLogs: {
          include: {
            performedBy: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!ticket) {
      throw new AppError('Ticket not found', 404, 'NOT_FOUND');
    }

    if (user.role === Role.AUTHOR && ticket.authorId !== user.id) {
      throw new AppError('Forbidden: You can only view your own tickets', 403, 'FORBIDDEN');
    }

    const sanitizedMessages = ticket.messages.filter((m) => {
      if (user.role === Role.AUTHOR && m.isInternalNote) {
        return false;
      }
      return true;
    });

    res.status(200).json({
      success: true,
      data: {
        ...ticket,
        messages: sanitizedMessages,
        author: {
          ...ticket.author,
          bankAccountDetails: ticket.author.bankAccountDetails
            ? JSON.parse(ticket.author.bankAccountDetails)
            : null,
        },
        book: ticket.book
          ? {
              ...ticket.book,
              platformSales: ticket.book.platformSalesJson
                ? JSON.parse(ticket.book.platformSalesJson)
                : null,
            }
          : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Submit a support query with AI Auto-Classification & Draft Generation
 */
export const createTicket = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;
    const { subject, description, bookId, attachments } = req.body;

    let bookData: any = null;
    if (bookId) {
      bookData = await prisma.book.findUnique({
        where: { id: bookId },
      });
      if (bookData && user.role === Role.AUTHOR && bookData.authorId !== user.id) {
        throw new AppError('Invalid book selection for this author', 400, 'INVALID_BOOK');
      }
    }

    const count = await prisma.ticket.count();
    const ticketNumber = `BL-${1000 + count + 1}`;

    let classificationResult;
    try {
      classificationResult = await aiService.classifyTicket(
        subject,
        description,
        bookData
          ? {
              title: bookData.title,
              isbn: bookData.isbn,
              status: bookData.status,
              totalCopiesSold: bookData.totalCopiesSold,
              totalRoyaltyEarned: bookData.totalRoyaltyEarned,
              royaltyPending: bookData.royaltyPending,
            }
          : null
      );
    } catch (aiErr) {
      classificationResult = {
        category: TicketCategory.GENERAL_INQUIRY,
        priority: TicketPriority.MEDIUM,
        confidence: 0.8,
        classificationReason: 'Automated fallback classification',
        priorityReason: 'Default priority',
        tokensUsed: 0,
        provider: 'Fallback',
      };
    }

    let draftResult;
    try {
      const authorFull = await prisma.user.findUnique({ where: { id: user.id } });
      draftResult = await aiService.generateDraftResponse(
        subject,
        description,
        classificationResult.category,
        {
          name: user.name,
          email: user.email,
          bankAccountLinked: authorFull?.bankAccountLinked ?? false,
          bankDetails: authorFull?.bankAccountDetails ? JSON.parse(authorFull.bankAccountDetails) : null,
        },
        bookData
          ? {
              title: bookData.title,
              isbn: bookData.isbn,
              status: bookData.status,
              totalCopiesSold: bookData.totalCopiesSold,
              totalRoyaltyEarned: bookData.totalRoyaltyEarned,
              royaltyPending: bookData.royaltyPending,
            }
          : null
      );
    } catch (draftErr) {
      draftResult = {
        draftResponse: 'Dear Author,\n\nThank you for reaching out to BookLeaf. We have received your query and our team will review and reply promptly.',
        relevantKbSections: [],
        tokensUsed: 0,
        provider: 'Fallback',
      };
    }

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        subject,
        description,
        category: classificationResult.category,
        priority: classificationResult.priority,
        status: TicketStatus.OPEN,
        aiClassified: true,
        aiConfidence: classificationResult.confidence,
        aiClassificationReason: classificationResult.classificationReason,
        aiPriorityReason: classificationResult.priorityReason,
        aiDraftResponse: draftResult.draftResponse,
        authorId: user.id,
        bookId: bookId || null,
        attachmentsJson: attachments ? JSON.stringify(attachments) : null,
      },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
        book: {
          select: { id: true, title: true, isbn: true },
        },
      },
    });

    await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        senderId: user.id,
        senderRole: user.role,
        message: description,
        attachmentsJson: attachments ? JSON.stringify(attachments) : null,
      },
    });

    await prisma.auditLog.create({
      data: {
        ticketId: ticket.id,
        performedById: user.id,
        action: 'TICKET_CREATED',
        details: `Ticket created with AI classification: ${classificationResult.category} (${classificationResult.priority})`,
      },
    });

    socketEvents.emitTicketCreated(ticket);

    res.status(201).json({
      success: true,
      message: 'Ticket submitted successfully',
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add message / reply to ticket
 */
export const replyTicket = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;
    const id = req.params.id as string;
    const { message, isInternalNote, attachments } = req.body;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: { author: true },
    });

    if (!ticket) {
      throw new AppError('Ticket not found', 404, 'NOT_FOUND');
    }

    if (user.role === Role.AUTHOR && ticket.authorId !== user.id) {
      throw new AppError('Forbidden: You can only reply to your own tickets', 403, 'FORBIDDEN');
    }

    const actualInternalNote = user.role === Role.ADMIN ? Boolean(isInternalNote) : false;

    const newMessage = await prisma.ticketMessage.create({
      data: {
        ticketId: id,
        senderId: user.id,
        senderRole: user.role,
        message,
        isInternalNote: actualInternalNote,
        attachmentsJson: attachments ? JSON.stringify(attachments) : null,
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    let statusUpdate: TicketStatus | undefined;
    if (user.role === Role.ADMIN && !actualInternalNote && ticket.status === TicketStatus.OPEN) {
      statusUpdate = TicketStatus.IN_PROGRESS;
    } else if (user.role === Role.AUTHOR && ticket.status === TicketStatus.RESOLVED) {
      statusUpdate = TicketStatus.IN_PROGRESS;
    }

    if (statusUpdate) {
      await prisma.ticket.update({
        where: { id },
        data: { status: statusUpdate },
      });
      socketEvents.emitTicketUpdated({ ...ticket, status: statusUpdate });
    }

    socketEvents.emitNewMessage(id, newMessage, ticket.authorId);

    res.status(201).json({
      success: true,
      message: actualInternalNote ? 'Internal note added' : 'Reply sent successfully',
      data: newMessage,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update ticket status
 */
export const updateTicketStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;
    const id = req.params.id as string;
    const { status } = req.body;

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      throw new AppError('Ticket not found', 404, 'NOT_FOUND');
    }

    if (user.role === Role.AUTHOR && ticket.authorId !== user.id) {
      throw new AppError('Forbidden', 403, 'FORBIDDEN');
    }

    const updated = await prisma.ticket.update({
      where: { id },
      data: { status },
      include: {
        author: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        ticketId: id,
        performedById: user.id,
        action: 'STATUS_CHANGE',
        details: `Status changed from ${ticket.status} to ${status}`,
      },
    });

    socketEvents.emitTicketUpdated(updated);

    res.status(200).json({
      success: true,
      message: `Ticket status updated to ${status}`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin override ticket priority
 */
export const updateTicketPriority = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;
    const id = req.params.id as string;
    const { priority, reason } = req.body;

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      throw new AppError('Ticket not found', 404, 'NOT_FOUND');
    }

    const updated = await prisma.ticket.update({
      where: { id },
      data: { priority },
    });

    await prisma.auditLog.create({
      data: {
        ticketId: id,
        performedById: user.id,
        action: 'PRIORITY_OVERRIDE',
        details: `Priority updated from ${ticket.priority} to ${priority}. Reason: ${reason || 'Admin override'}`,
      },
    });

    socketEvents.emitTicketUpdated(updated);

    res.status(200).json({
      success: true,
      message: `Priority updated to ${priority}`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin override ticket category
 */
export const updateTicketCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;
    const id = req.params.id as string;
    const { category, reason } = req.body;

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      throw new AppError('Ticket not found', 404, 'NOT_FOUND');
    }

    const updated = await prisma.ticket.update({
      where: { id },
      data: { category },
    });

    await prisma.auditLog.create({
      data: {
        ticketId: id,
        performedById: user.id,
        action: 'CATEGORY_OVERRIDE',
        details: `Category updated from ${ticket.category} to ${category}. Reason: ${reason || 'Admin override'}`,
      },
    });

    socketEvents.emitTicketUpdated(updated);

    res.status(200).json({
      success: true,
      message: `Category updated to ${category}`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Assign ticket to admin
 */
export const assignTicket = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;
    const id = req.params.id as string;
    const { adminId } = req.body;

    let assignee = null;
    if (adminId) {
      assignee = await prisma.user.findFirst({
        where: { id: adminId, role: Role.ADMIN },
      });
      if (!assignee) {
        throw new AppError('Assigned user must be an active administrator', 400, 'INVALID_ADMIN');
      }
    }

    const updated = await prisma.ticket.update({
      where: { id },
      data: { assignedToId: adminId },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        ticketId: id,
        performedById: user.id,
        action: 'ASSIGNED',
        details: assignee ? `Assigned to ${assignee.name}` : 'Unassigned',
      },
    });

    socketEvents.emitTicketUpdated(updated);

    res.status(200).json({
      success: true,
      message: assignee ? `Ticket assigned to ${assignee.name}` : 'Ticket unassigned',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate or regenerate AI Draft response on demand
 */
export const generateAiDraft = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        author: true,
        book: true,
      },
    });

    if (!ticket) {
      throw new AppError('Ticket not found', 404, 'NOT_FOUND');
    }

    const draftResult = await aiService.generateDraftResponse(
      ticket.subject,
      ticket.description,
      ticket.category,
      {
        name: ticket.author.name,
        email: ticket.author.email,
        bankAccountLinked: ticket.author.bankAccountLinked,
        bankDetails: ticket.author.bankAccountDetails
          ? JSON.parse(ticket.author.bankAccountDetails)
          : null,
      },
      ticket.book
        ? {
            title: ticket.book.title,
            isbn: ticket.book.isbn,
            status: ticket.book.status,
            totalCopiesSold: ticket.book.totalCopiesSold,
            totalRoyaltyEarned: ticket.book.totalRoyaltyEarned,
            royaltyPending: ticket.book.royaltyPending,
          }
        : null
    );

    await prisma.ticket.update({
      where: { id },
      data: { aiDraftResponse: draftResult.draftResponse },
    });

    res.status(200).json({
      success: true,
      message: 'AI draft response generated successfully',
      data: {
        draftResponse: draftResult.draftResponse,
        relevantKbSections: draftResult.relevantKbSections,
        provider: draftResult.provider,
        tokensUsed: draftResult.tokensUsed,
      },
    });
  } catch (error) {
    next(error);
  }
};
