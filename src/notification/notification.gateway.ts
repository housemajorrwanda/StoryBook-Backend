import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

interface AuthenticatedSocket extends Socket {
  userId?: number;
  userRole?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: 'notifications',
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const authToken = client.handshake.auth?.token as string | undefined;
      const headerToken = client.handshake.headers?.authorization?.replace(
        'Bearer ',
        '',
      );
      const token = authToken ?? headerToken;

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.emit('error', { message: 'Authentication token required' });
        client.disconnect();
        return;
      }

      const secret =
        this.configService.get<string>('JWT_SECRET') ||
        'your-super-secret-jwt-key-change-this-in-production';

      const payload = this.jwtService.verify<{
        sub: number | string;
        role?: string;
      }>(token, { secret });

      const userId =
        typeof payload.sub === 'string'
          ? parseInt(payload.sub, 10)
          : payload.sub;

      if (!userId || isNaN(userId)) {
        client.emit('error', { message: 'Invalid token payload' });
        client.disconnect();
        return;
      }

      client.userId = userId;
      client.userRole = payload.role ?? 'user';

      // Join personal room for targeted notifications
      await client.join(`user:${userId}`);

      // Admins also join the admin broadcast room
      if (client.userRole === 'admin') {
        await client.join('room:admin');
      }

      this.logger.log(
        `Client connected: ${client.id} | user:${userId} | role:${client.userRole}`,
      );

      client.emit('connected', {
        message: 'Connected to notification service',
        userId,
      });
    } catch {
      this.logger.warn(`Client ${client.id} failed JWT verification`);
      client.emit('error', { message: 'Invalid or expired token' });
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(
      `Client disconnected: ${client.id} | user:${client.userId ?? 'unauthenticated'}`,
    );
  }

  // ─── Emit helpers (called by NotificationService) ───────────────────────────

  /** Push a new notification to a specific user's room */
  emitToUser(
    userId: number,
    notification: Record<string, unknown>,
    unreadCount: number,
  ) {
    this.server.to(`user:${userId}`).emit('notification:new', {
      notification,
      unreadCount,
    });
  }

  /** Push a new notification to all admins */
  emitToAdmins(notification: Record<string, unknown>, unreadCount: number) {
    this.server.to('room:admin').emit('notification:new', {
      notification,
      unreadCount,
    });
  }

  /** Tell a user's sockets that a notification was marked read */
  emitReadUpdate(userId: number, notificationId: number, unreadCount: number) {
    this.server.to(`user:${userId}`).emit('notification:read', {
      notificationId,
      unreadCount,
    });
  }

  /** Tell all admins that all notifications are cleared */
  emitAllReadToAdmins(unreadCount: number) {
    this.server.to('room:admin').emit('notification:all_read', { unreadCount });
  }

  /** Tell a specific user that all their notifications are cleared */
  emitAllReadToUser(userId: number, unreadCount: number) {
    this.server
      .to(`user:${userId}`)
      .emit('notification:all_read', { unreadCount });
  }

  // ─── Client-initiated events ─────────────────────────────────────────────────

  /** Client requests its current unread count on reconnect / tab focus */
  @SubscribeMessage('notification:get_unread_count')
  handleGetUnreadCount(@ConnectedSocket() client: AuthenticatedSocket) {
    // The service will handle the DB query; we just ack so the client knows
    // the gateway is alive. Real count is pushed reactively.
    client.emit('notification:ack', { event: 'get_unread_count' });
  }
}
