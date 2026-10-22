import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'bookleaf_jwt_secure_secret_key_prod_grade_2026';

let ioInstance: SocketIOServer | null = null;

export const initSocketServer = (io: SocketIOServer) => {
  ioInstance = io;

  // Socket authentication middleware
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Authentication required for real-time socket connection'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: Role };
      socket.data.user = decoded;
      next();
    } catch (err) {
      next(new Error('Invalid or expired socket authentication token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user;
    if (!user) return;

    // Join user's individual room
    socket.join(`user:${user.id}`);

    // If Admin, join the global ops room
    if (user.role === Role.ADMIN) {
      socket.join('admins');
      console.log(`📡 Ops Admin connected to real-time socket: ${user.email}`);
    } else {
      console.log(`📡 Author connected to real-time socket: ${user.email}`);
    }

    // Join specific ticket room for active chat / discussion
    socket.on('join:ticket', (ticketId: string) => {
      socket.join(`ticket:${ticketId}`);
    });

    socket.on('leave:ticket', (ticketId: string) => {
      socket.leave(`ticket:${ticketId}`);
    });

    // Typing indicators
    socket.on('typing:start', ({ ticketId, name }: { ticketId: string; name: string }) => {
      socket.to(`ticket:${ticketId}`).emit('typing:status', {
        ticketId,
        name,
        isTyping: true,
      });
    });

    socket.on('typing:stop', ({ ticketId, name }: { ticketId: string; name: string }) => {
      socket.to(`ticket:${ticketId}`).emit('typing:status', {
        ticketId,
        name,
        isTyping: false,
      });
    });

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });
};

/**
 * Socket Emitter Helper to broadcast updates across rooms
 */
export const socketEvents = {
  emitTicketCreated: (ticket: any) => {
    if (!ioInstance) return;
    // Broadcast to admins queue
    ioInstance.to('admins').emit('ticket:created', ticket);
    // Broadcast to author
    ioInstance.to(`user:${ticket.authorId}`).emit('ticket:created', ticket);
  },

  emitTicketUpdated: (ticket: any) => {
    if (!ioInstance) return;
    ioInstance.to(`ticket:${ticket.id}`).emit('ticket:updated', ticket);
    ioInstance.to('admins').emit('ticket:updated', ticket);
    ioInstance.to(`user:${ticket.authorId}`).emit('ticket:updated', ticket);
  },

  emitNewMessage: (ticketId: string, message: any, authorId: string) => {
    if (!ioInstance) return;
    if (message.isInternalNote) {
      // Strict security: Internal notes ONLY emitted to admins
      ioInstance.to('admins').emit('message:new', { ticketId, message });
    } else {
      ioInstance.to(`ticket:${ticketId}`).emit('message:new', { ticketId, message });
      ioInstance.to(`user:${authorId}`).emit('message:new', { ticketId, message });
      ioInstance.to('admins').emit('message:new', { ticketId, message });
    }
  },
};
