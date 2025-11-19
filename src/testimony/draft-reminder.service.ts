import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class DraftReminderService {
  private readonly logger = new Logger(DraftReminderService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  // Run every Monday at 9 AM
  @Cron('0 9 * * 1', {
    name: 'draft-reminder',
    timeZone: 'UTC',
  })
  async handleDraftReminders() {
    this.logger.log('Starting draft reminder check...');

    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const oldDrafts = (await this.prisma.testimony.findMany({
        where: {
          isDraft: true,
          draftLastSavedAt: {
            lte: oneWeekAgo,
          },
          OR: [
            {
              lastReminderSentAt: null,
            },
            {
              lastReminderSentAt: {
                lte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              },
            },
          ],
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
            },
          },
        },
      })) as Array<{
        id: number;
        eventTitle: string;
        draftLastSavedAt: Date | null;
        userId: number | null;
        user: {
          id: number;
          email: string;
          fullName: string | null;
        } | null;
      }>;

      this.logger.log(`Found ${oldDrafts.length} drafts needing reminders`);

      let sentCount = 0;
      let errorCount = 0;

      for (const draft of oldDrafts) {
        if (!draft.user?.email) {
          this.logger.warn(
            `Skipping draft ${draft.id} - user has no email address`,
          );
          continue;
        }

        try {
          const daysSinceLastSaved = Math.floor(
            (Date.now() - draft.draftLastSavedAt!.getTime()) /
              (1000 * 60 * 60 * 24),
          );

          await this.emailService.sendDraftReminderEmail({
            to: draft.user.email,
            userName: draft.user.fullName || undefined,
            testimonyTitle: draft.eventTitle,
            testimonyId: draft.id,
            daysSinceLastSaved,
          });

          // Update lastReminderSentAt
          await this.prisma.testimony.update({
            where: { id: draft.id },
            data: { lastReminderSentAt: new Date() } as {
              lastReminderSentAt: Date;
            },
          });

          sentCount++;
          this.logger.log(
            `Reminder sent for draft "${draft.eventTitle}" (ID: ${draft.id}) to ${draft.user.email}`,
          );
        } catch (error) {
          errorCount++;
          this.logger.error(
            `Failed to send reminder for draft ${draft.id}:`,
            error,
          );
        }
      }

      this.logger.log(
        `Draft reminder check completed. Sent: ${sentCount}, Errors: ${errorCount}`,
      );
    } catch (error) {
      this.logger.error('Error in draft reminder check:', error);
    }
  }
}
