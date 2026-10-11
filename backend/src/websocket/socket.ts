import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';

let io: Server | undefined;

interface SocketUserPayload {
  id: string;
}

interface NotificationPayload {
  type: string;
  title: string;
  message: string;
  requestId?: string;
  loanId?: string;
  referenceId?: string;
  [key: string]: unknown;
}

interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
  };
}

/**
 * Initialize Socket.IO
 */
export function initSocket(server: any): Server {
  io = new Server(server, {
    cors: {
      origin: env.clientUrl,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  /**
   * Authenticate every Socket.IO connection using JWT.
   */
  io.use((socket, next) => {
    try {
      const token = String(
        socket.handshake.auth?.token || ''
      );

      if (!token) {
        return next(
          new Error('Authentication token is required')
        );
      }

      const user = jwt.verify(
        token,
        env.jwtSecret
      ) as SocketUserPayload;

      if (!user?.id) {
        return next(
          new Error('Invalid authentication token')
        );
      }

      socket.data.userId = user.id;

      next();
    } catch (error) {
      console.error(
        'Socket authentication error:',
        error
      );

      next(new Error('Unauthorized'));
    }
  });

  /**
   * Handle new client connections.
   */
  io.on(
    'connection',
    (socket: AuthenticatedSocket) => {
      const userId = socket.data.userId;

      console.log(
        `Socket connected: ${socket.id} | User: ${userId}`
      );

      /**
       * Every user gets their own private room.
       *
       * Example:
       * user:68abc123...
       */
      socket.join(`user:${userId}`);

      /**
       * Optional disconnect logging.
       */
      socket.on('disconnect', reason => {
        console.log(
          `Socket disconnected: ${socket.id} | User: ${userId} | Reason: ${reason}`
        );
      });
    }
  );

  return io;
}

/**
 * Get the initialized Socket.IO instance.
 *
 * Useful if another part of the application needs
 * direct access to Socket.IO.
 */
export function getIO(): Server | undefined {
  return io;
}

/**
 * Tell all connected clients that dashboard data
 * has changed.
 *
 * Frontend can then reload dashboard data from API.
 */
export function emitDashboardChanged(): void {
  if (!io) {
    console.warn(
      'Socket.IO is not initialized. dashboard:changed was not emitted.'
    );

    return;
  }

  io.emit('dashboard:changed');
}

/**
 * Send a notification to one specific user.
 *
 * The user must be connected to:
 * user:<userId>
 */
export function emitUserNotification(
  userId: string,
  payload: NotificationPayload
): void {
  if (!io) {
    console.warn(
      'Socket.IO is not initialized. notification:new was not emitted.'
    );

    return;
  }

  io.to(`user:${userId}`).emit(
    'notification:new',
    payload
  );
}

/**
 * Send an event to a specific user's private room.
 *
 * This is useful for future events such as:
 * loan status changes, equipment updates, etc.
 */
export function emitToUser(
  userId: string,
  event: string,
  payload: unknown
): void {
  if (!io) {
    console.warn(
      `Socket.IO is not initialized. Event "${event}" was not emitted.`
    );

    return;
  }

  io.to(`user:${userId}`).emit(event, payload);
}