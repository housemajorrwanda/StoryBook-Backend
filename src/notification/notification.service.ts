import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Notification } from '@prisma/client';
import {
  CreateNotificationInput,
  NotificationAudience,
} from './notification.types';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { generateTestimonyUrl } from '../common/utils/slug.util';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async createNotification(
    input: CreateNotificationInput,
  ): Promise<Notification> {
    try {
      return await this.prisma.notification.create({
        data: {
          title: input.title,
          message: input.message,
          type: input.type,
          audience: input.audience ?? 'admin',
          priority: input.priority ?? 'normal',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          metadata: (input.metadata ?? undefined) as any,
          userId: input.userId,
        },
      });
    } catch (error) {
      console.error('Failed to create notification:', error);
      throw new InternalServerErrorException(
        'Unable to create notification entry',
      );
    }
  }

  async createAdminNotification(
    input: Omit<CreateNotificationInput, 'audience'>,
  ): Promise<Notification> {
    return this.createNotification({ ...input, audience: 'admin' });
  }

  async notifyTestimonySubmitted(params: {
    testimonyId: number;
    submissionType: string;
    submitterName?: string;
    isDraft?: boolean;
  }): Promise<void> {
    if (params.isDraft) {
      return;
    }

    // Fetch testimony to get title for URL generation
    const testimony = await this.prisma.testimony.findUnique({
      where: { id: params.testimonyId },
      select: { id: true, eventTitle: true },
    });

    const url = testimony
      ? generateTestimonyUrl(testimony.id, testimony.eventTitle)
      : null;

    await this.createAdminNotification({
      type: 'testimony_submitted',
      title: 'New testimony submitted',
      message: `${params.submitterName ?? 'A storyteller'} submitted a new ${params.submissionType} testimony.`,
      priority: 'high',
      metadata: {
        testimonyId: params.testimonyId,
        submissionType: params.submissionType,
        url,
      },
    });
  }

  async notifyFeedbackResolved(params: {
    testimonyId: number;
    status: string;
    adminId: number;
    feedback?: string;
  }): Promise<void> {
    // Fetch testimony to get title for URL generation
    const testimony = await this.prisma.testimony.findUnique({
      where: { id: params.testimonyId },
      select: { id: true, eventTitle: true },
    });

    const url = testimony
      ? generateTestimonyUrl(testimony.id, testimony.eventTitle)
      : null;

    await this.createAdminNotification({
      type: 'feedback_resolved',
      title: `Feedback resolved for testimony #${params.testimonyId}`,
      message: `Admin #${params.adminId} marked the testimony as ${params.status}.`,
      metadata: {
        testimonyId: params.testimonyId,
        status: params.status,
        feedback: params.feedback,
        url,
      },
    });
  }

  async notifyAiConnectionSuggestion(params: {
    testimonyId: number;
    relatedTestimonyId: number;
    similarityScore?: number;
  }): Promise<void> {
    // Fetch testimonies with their owners for URL generation + user notifications
    const [testimony, relatedTestimony] = await Promise.all([
      this.prisma.testimony.findUnique({
        where: { id: params.testimonyId },
        select: { id: true, eventTitle: true, userId: true },
      }),
      this.prisma.testimony.findUnique({
        where: { id: params.relatedTestimonyId },
        select: { id: true, eventTitle: true, userId: true },
      }),
    ]);

    const url = testimony
      ? generateTestimonyUrl(testimony.id, testimony.eventTitle)
      : null;
    const relatedUrl = relatedTestimony
      ? generateTestimonyUrl(relatedTestimony.id, relatedTestimony.eventTitle)
      : null;

    const score = params.similarityScore
      ? `${Math.round(params.similarityScore * 100)}%`
      : undefined;

    // 1. Admin notification
    await this.createAdminNotification({
      type: 'ai_connection',
      title: 'AI found a potential connection',
      message: `AI suggested a relation between testimonies #${params.testimonyId} and #${params.relatedTestimonyId}.`,
      priority: 'normal',
      metadata: {
        testimonyId: params.testimonyId,
        relatedTestimonyId: params.relatedTestimonyId,
        similarityScore: params.similarityScore,
        url,
        relatedUrl,
      },
    });

    // 2. Notify testimony owner (fromId)
    if (testimony?.userId) {
      await this.createNotification({
        type: 'ai_connection',
        audience: 'user',
        userId: testimony.userId,
        title: 'New connection found for your testimony',
        message: `AI found a ${score ? `${score} match` : 'connection'} between your testimony "${testimony.eventTitle}" and "${relatedTestimony?.eventTitle ?? `#${params.relatedTestimonyId}`}".`,
        metadata: {
          testimonyId: params.testimonyId,
          relatedTestimonyId: params.relatedTestimonyId,
          similarityScore: params.similarityScore,
          url,
          relatedUrl,
        },
      });
    }

    // 3. Notify related testimony owner (toId) — skip if same user
    if (
      relatedTestimony?.userId &&
      relatedTestimony.userId !== testimony?.userId
    ) {
      await this.createNotification({
        type: 'ai_connection',
        audience: 'user',
        userId: relatedTestimony.userId,
        title: 'New connection found for your testimony',
        message: `AI found a ${score ? `${score} match` : 'connection'} between your testimony "${relatedTestimony.eventTitle}" and "${testimony?.eventTitle ?? `#${params.testimonyId}`}".`,
        metadata: {
          testimonyId: params.relatedTestimonyId,
          relatedTestimonyId: params.testimonyId,
          similarityScore: params.similarityScore,
          url: relatedUrl,
          relatedUrl: url,
        },
      });
    }
  }

  async listNotifications(query: NotificationQueryDto) {
    const skip = query.skip ?? 0;
    const requestedLimit = query.limit ?? DEFAULT_LIMIT;
    const limit = Math.min(Math.max(requestedLimit, 1), MAX_LIMIT);
    const audience = query.audience ?? 'admin';

    const where = {
      audience,
      status: query.status,
      type: query.type,
      ...(query.search
        ? {
            OR: [
              {
                title: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                message: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : undefined),
    };

    const [total, notifications] = await this.prisma.$transaction([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: notifications,
      total,
      skip,
      limit,
    };
  }

  async markAsRead(id: number): Promise<Notification> {
    try {
      return await this.prisma.notification.update({
        where: { id },
        data: {
          status: 'read',
          readAt: new Date(),
        },
      });
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        throw new NotFoundException('Notification not found');
      }
      console.error('Failed to mark notification as read:', error);
      throw new InternalServerErrorException(
        'Unable to update notification status',
      );
    }
  }

  async markAllAsRead(audience: NotificationAudience = 'admin') {
    try {
      const result = await this.prisma.notification.updateMany({
        where: {
          audience,
          status: 'unread',
        },
        data: {
          status: 'read',
          readAt: new Date(),
        },
      });

      return { updated: result.count };
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
      throw new InternalServerErrorException(
        'Unable to update notifications status',
      );
    }
  }
}
