import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  EmbeddingProviderService,
  EmbeddingSectionRequest,
} from './embedding-provider.service';
import { TranscriptionService } from './transcription.service';
import { TestimonyConnectionService } from './testimony-connection.service';
import { NotificationService } from '../notification/notification.service';
import { EmailService } from '../email/email.service';

/** Structured error codes for AI pipeline failures */
export enum AiErrorCode {
  TRANSCRIPTION_TIMEOUT = 'TRANSCRIPTION_TIMEOUT',
  TRANSCRIPTION_NETWORK_ERROR = 'TRANSCRIPTION_NETWORK_ERROR',
  TRANSCRIPTION_INVALID_AUDIO = 'TRANSCRIPTION_INVALID_AUDIO',
  TRANSCRIPTION_SERVICE_UNAVAILABLE = 'TRANSCRIPTION_SERVICE_UNAVAILABLE',
  TRANSCRIPTION_EMPTY_RESULT = 'TRANSCRIPTION_EMPTY_RESULT',
  TRANSCRIPTION_FILE_TOO_LONG = 'TRANSCRIPTION_FILE_TOO_LONG',
  NO_MEDIA_URL = 'NO_MEDIA_URL',
  EMBEDDING_FAILED = 'EMBEDDING_FAILED',
  UNKNOWN = 'UNKNOWN',
}

/** Max concurrent AI processing jobs */
const MAX_CONCURRENT_PROCESSING = 5;

@Injectable()
export class TestimonyAiService {
  private readonly logger = new Logger(TestimonyAiService.name);

  /** Semaphore to limit concurrent processing */
  private activeJobs = 0;
  private readonly jobQueue: Array<() => void> = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingProvider: EmbeddingProviderService,
    private readonly transcriptionService: TranscriptionService,
    private readonly connectionService: TestimonyConnectionService,
    private readonly notificationService: NotificationService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Acquire a concurrency slot. Resolves when a slot is available.
   */
  private async acquireSlot(): Promise<void> {
    if (this.activeJobs < MAX_CONCURRENT_PROCESSING) {
      this.activeJobs++;
      return;
    }
    return new Promise<void>((resolve) => {
      this.jobQueue.push(() => {
        this.activeJobs++;
        resolve();
      });
    });
  }

  /**
   * Release a concurrency slot and process next queued job.
   */
  private releaseSlot(): void {
    this.activeJobs--;
    const next = this.jobQueue.shift();
    if (next) next();
  }

  /**
   * Classify an error into a structured error code
   */
  private classifyError(error: unknown): {
    code: AiErrorCode;
    message: string;
  } {
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (
        msg.includes('econnaborted') ||
        msg.includes('timeout') ||
        msg.includes('timed out')
      ) {
        return {
          code: AiErrorCode.TRANSCRIPTION_TIMEOUT,
          message: `Transcription timed out: ${error.message}`,
        };
      }
      if (
        msg.includes('econnrefused') ||
        msg.includes('enotfound') ||
        msg.includes('econnreset')
      ) {
        return {
          code: AiErrorCode.TRANSCRIPTION_NETWORK_ERROR,
          message: `Network error: ${error.message}`,
        };
      }
      if (msg.includes('503') || msg.includes('service unavailable')) {
        return {
          code: AiErrorCode.TRANSCRIPTION_SERVICE_UNAVAILABLE,
          message: `Service unavailable: ${error.message}`,
        };
      }
      if (
        msg.includes('unsupported') ||
        msg.includes('invalid') ||
        msg.includes('format')
      ) {
        return {
          code: AiErrorCode.TRANSCRIPTION_INVALID_AUDIO,
          message: `Invalid audio/video format: ${error.message}`,
        };
      }
    }
    return {
      code: AiErrorCode.UNKNOWN,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  /**
   * Check if an error is retriable (timeouts, network, 5xx) vs permanent (bad format)
   */
  private isRetriableError(code: AiErrorCode): boolean {
    return [
      AiErrorCode.TRANSCRIPTION_TIMEOUT,
      AiErrorCode.TRANSCRIPTION_NETWORK_ERROR,
      AiErrorCode.TRANSCRIPTION_SERVICE_UNAVAILABLE,
      AiErrorCode.UNKNOWN,
    ].includes(code);
  }

  /**
   * Generate content hash for media URL to detect changes
   */
  private generateMediaHash(url: string): string {
    return createHash('sha256').update(url).digest('hex');
  }

  /**
   * Main AI processing pipeline with status tracking, retry, caching, concurrency control
   */
  async processTestimony(testimonyId: number) {
    await this.acquireSlot();
    try {
      await this._processTestimony(testimonyId);
    } finally {
      this.releaseSlot();
    }
  }

  private async _processTestimony(testimonyId: number) {
    this.logger.log(`Starting AI processing for testimony ${testimonyId}`);
    try {
      const testimony = await this.prisma.testimony.findUnique({
        where: { id: testimonyId },
      });

      if (!testimony) {
        this.logger.warn(`Testimony ${testimonyId} not found for AI process`);
        return;
      }

      let transcript = testimony.transcript ?? undefined;
      const needsTranscript =
        !transcript &&
        ['audio', 'video'].includes(testimony.submissionType ?? '');

      // Smart caching: skip if media URL hash unchanged and transcript exists
      const mediaUrl = testimony.audioUrl ?? testimony.videoUrl ?? null;
      const currentMediaHash = mediaUrl
        ? this.generateMediaHash(mediaUrl)
        : null;

      if (
        !needsTranscript ||
        (currentMediaHash &&
          testimony.mediaContentHash === currentMediaHash &&
          testimony.transcript)
      ) {
        if (testimony.transcript) {
          this.logger.log(
            `Skipping transcription for testimony ${testimonyId}: media unchanged or already transcribed`,
          );
          transcript = testimony.transcript;
        }
      } else if (needsTranscript) {
        // Update status to processing
        await this.prisma.testimony.update({
          where: { id: testimonyId },
          data: {
            transcriptionStatus: 'processing',
            transcriptionStartedAt: new Date(),
            transcriptionAttempts: { increment: 1 },
          },
        });

        const mediaType =
          testimony.submissionType === 'video' ? 'video' : 'audio';
        const mediaDurationSeconds =
          testimony.submissionType === 'video'
            ? (testimony.videoDuration ?? undefined)
            : (testimony.audioDuration ?? undefined);

        if (!mediaUrl) {
          await this.prisma.testimony.update({
            where: { id: testimonyId },
            data: {
              transcriptionStatus: 'failed',
              transcriptionError: AiErrorCode.NO_MEDIA_URL,
            },
          });
        } else {
          // Retry with exponential backoff
          const maxRetries = 3;
          let lastErrorCode: AiErrorCode = AiErrorCode.UNKNOWN;
          let lastErrorMessage = '';
          let transcriptResult: string | null = null;

          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              if (attempt > 1) {
                const delay = 1000 * Math.pow(2, attempt - 1);
                this.logger.log(
                  `Retry ${attempt}/${maxRetries} for testimony ${testimonyId} after ${delay}ms`,
                );
                await new Promise((r) => setTimeout(r, delay));
              }

              transcriptResult =
                await this.transcriptionService.transcribeFromUrl(
                  mediaUrl,
                  mediaDurationSeconds,
                  mediaType,
                );

              if (transcriptResult) break;

              lastErrorCode = AiErrorCode.TRANSCRIPTION_EMPTY_RESULT;
              lastErrorMessage = 'Transcription returned empty result';
            } catch (error) {
              const classified = this.classifyError(error);
              lastErrorCode = classified.code;
              lastErrorMessage = classified.message;

              if (!this.isRetriableError(classified.code)) break;
            }
          }

          if (transcriptResult) {
            transcript = transcriptResult;
            await this.prisma.testimony.update({
              where: { id: testimonyId },
              data: {
                transcriptionStatus: 'completed',
                transcriptionCompletedAt: new Date(),
                transcriptionError: null,
                mediaContentHash: currentMediaHash,
              },
            });

            // Notify user transcript is ready
            void this.notifyTranscriptReady(testimony, testimonyId);
          } else {
            await this.prisma.testimony.update({
              where: { id: testimonyId },
              data: {
                transcriptionStatus: 'failed',
                transcriptionError: `${lastErrorCode}: ${lastErrorMessage}`,
              },
            });

            // Notify user of failure
            void this.notifyTranscriptFailed(
              testimony,
              testimonyId,
              lastErrorCode,
            );
          }
        }
      }

      // Save transcript and metadata
      const updateData: Record<string, unknown> = {};

      if (transcript && transcript !== testimony.transcript) {
        updateData.transcript = transcript;
      }

      const summarySource =
        testimony.summary ??
        testimony.fullTestimony ??
        testimony.eventDescription ??
        transcript ??
        null;
      if (summarySource) {
        updateData.summary = summarySource.slice(0, 500).trim();
      }

      const keyPhrasesSource = [
        testimony.eventTitle,
        testimony.eventDescription,
        testimony.fullTestimony,
        transcript,
      ]
        .filter((chunk): chunk is string => !!chunk)
        .join(' ');
      if (keyPhrasesSource) {
        updateData.keyPhrases = this.extractKeyPhrases(keyPhrasesSource);
      }

      if (Object.keys(updateData).length > 0) {
        try {
          await this.prisma.testimony.update({
            where: { id: testimonyId },
            data: updateData,
          });
        } catch (updateError) {
          this.logger.error(
            `Failed to save transcript for testimony ${testimonyId}:`,
            updateError instanceof Error
              ? updateError
              : new Error(String(updateError)),
          );
        }
      }

      // Embeddings with status tracking
      const sections = this.buildEmbeddingSections(testimony, transcript);
      if (sections.length === 0) {
        this.logger.warn(
          `Skipping embeddings for testimony ${testimonyId} - no text content`,
        );
        return;
      }

      await this.prisma.testimony.update({
        where: { id: testimonyId },
        data: { embeddingStatus: 'pending' },
      });

      try {
        const vectors = await this.embeddingProvider.embedSections(sections);
        const entries = Object.entries(vectors);

        if (entries.length > 0) {
          await this.prisma.$transaction(async (tx) => {
            const sectionsToReplace = entries.map(([section]) => section);
            await tx.testimonyEmbedding.deleteMany({
              where: {
                testimonyId,
                section: { in: sectionsToReplace },
              },
            });
            await tx.testimonyEmbedding.createMany({
              data: entries.map(([section, vector]) => ({
                testimonyId,
                section,
                model: this.embeddingProvider.getModelName(),
                vector,
              })),
            });
          });

          await this.prisma.testimony.update({
            where: { id: testimonyId },
            data: { embeddingStatus: 'completed', embeddingError: null },
          });
        }
      } catch (embeddingError) {
        const errMsg =
          embeddingError instanceof Error
            ? embeddingError.message
            : String(embeddingError);

        await this.prisma.testimony.update({
          where: { id: testimonyId },
          data: {
            embeddingStatus: 'failed',
            embeddingError: `${AiErrorCode.EMBEDDING_FAILED}: ${errMsg}`,
          },
        });
        this.logger.error(
          `Embeddings failed for testimony ${testimonyId}: ${errMsg}`,
        );
      }

      this.logger.log(`Finished AI processing for testimony ${testimonyId}`);

      // Auto re-discover connections (important when transcript was just added)
      void this.connectionService
        .discoverConnections(testimonyId)
        .catch((err) =>
          this.logger.warn(
            `Failed to discover connections for testimony ${testimonyId}:`,
            err,
          ),
        );
    } catch (error) {
      this.logger.error(
        `Failed to process testimony ${testimonyId}`,
        error as Error,
      );
    }
  }

  // ========== Notifications ==========

  private async notifyTranscriptReady(
    testimony: { userId?: number | null; eventTitle: string },
    testimonyId: number,
  ) {
    try {
      if (!testimony.userId) return;

      await this.notificationService.createNotification({
        type: 'transcript_ready',
        audience: 'user',
        userId: testimony.userId,
        title: 'Your transcript is ready',
        message: `The transcript for "${testimony.eventTitle}" has been generated successfully.`,
        metadata: { testimonyId },
      });

      const user = await this.prisma.user.findUnique({
        where: { id: testimony.userId },
        select: { email: true },
      });

      if (user?.email) {
        await this.emailService.sendTestimonyStatusEmail({
          to: user.email,
          status: 'approved',
          testimonyTitle: testimony.eventTitle,
          testimonyId,
          feedback:
            'Your audio/video has been transcribed. You can now view the full transcript.',
        });
      }
    } catch (err) {
      this.logger.warn('Failed to send transcript ready notification:', err);
    }
  }

  private async notifyTranscriptFailed(
    testimony: { userId?: number | null; eventTitle: string },
    testimonyId: number,
    errorCode: AiErrorCode,
  ) {
    try {
      if (!testimony.userId) return;

      const userMessage = this.getUserFriendlyError(errorCode);

      await this.notificationService.createNotification({
        type: 'transcript_failed',
        audience: 'user',
        userId: testimony.userId,
        title: 'Transcript generation failed',
        message: `We couldn't generate a transcript for "${testimony.eventTitle}". ${userMessage}`,
        metadata: { testimonyId, errorCode },
      });
    } catch (err) {
      this.logger.warn('Failed to send transcript failure notification:', err);
    }
  }

  private getUserFriendlyError(code: AiErrorCode): string {
    switch (code) {
      case AiErrorCode.TRANSCRIPTION_TIMEOUT:
        return 'The file took too long to process. Try a shorter recording.';
      case AiErrorCode.TRANSCRIPTION_NETWORK_ERROR:
        return 'Our transcription service is temporarily unreachable. We will retry automatically.';
      case AiErrorCode.TRANSCRIPTION_INVALID_AUDIO:
        return 'The audio/video format is not supported. Please try MP3, WAV, or MP4.';
      case AiErrorCode.TRANSCRIPTION_SERVICE_UNAVAILABLE:
        return 'Our transcription service is under maintenance. We will retry automatically.';
      case AiErrorCode.TRANSCRIPTION_EMPTY_RESULT:
        return 'No speech was detected. Please check if the file has audio content.';
      case AiErrorCode.NO_MEDIA_URL:
        return 'No audio/video file was found for this testimony.';
      default:
        return 'An unexpected error occurred. Our team has been notified.';
    }
  }

  // ========== Admin AI Tools ==========

  async getPendingTranscriptions() {
    return this.prisma.testimony.findMany({
      where: {
        submissionType: { in: ['audio', 'video'] },
        transcript: null,
        status: 'approved',
      },
      select: {
        id: true,
        eventTitle: true,
        submissionType: true,
        transcriptionStatus: true,
        transcriptionError: true,
        transcriptionAttempts: true,
        transcriptionStartedAt: true,
        audioUrl: true,
        videoUrl: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPendingEmbeddings() {
    return this.prisma.testimony.findMany({
      where: {
        status: 'approved',
        OR: [
          { embeddingStatus: 'failed' },
          { embeddingStatus: null, embeddings: { none: {} } },
        ],
      },
      select: {
        id: true,
        eventTitle: true,
        submissionType: true,
        embeddingStatus: true,
        embeddingError: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAiFailures() {
    const [transcriptionFailures, embeddingFailures] = await Promise.all([
      this.prisma.testimony.findMany({
        where: { transcriptionStatus: 'failed' },
        select: {
          id: true,
          eventTitle: true,
          submissionType: true,
          transcriptionError: true,
          transcriptionAttempts: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.testimony.findMany({
        where: { embeddingStatus: 'failed' },
        select: {
          id: true,
          eventTitle: true,
          embeddingError: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      transcriptionFailures: {
        count: transcriptionFailures.length,
        items: transcriptionFailures,
      },
      embeddingFailures: {
        count: embeddingFailures.length,
        items: embeddingFailures,
      },
    };
  }

  async processBatch() {
    const pending = await this.prisma.testimony.findMany({
      where: {
        status: 'approved',
        OR: [
          { submissionType: { in: ['audio', 'video'] }, transcript: null },
          {
            OR: [
              { embeddingStatus: 'failed' },
              { embeddingStatus: null },
            ],
            embeddings: { none: {} },
          },
        ],
      },
      select: { id: true },
      take: 50,
    });

    let queued = 0;
    for (const t of pending) {
      void this.processTestimony(t.id).catch((err) =>
        this.logger.error(`Batch processing failed for ${t.id}:`, err),
      );
      queued++;
    }

    return {
      message: `Queued ${queued} testimonies for processing (max ${MAX_CONCURRENT_PROCESSING} concurrent)`,
      queued,
    };
  }

  async retryFailedTranscriptions() {
    const failed = await this.prisma.testimony.findMany({
      where: {
        transcriptionStatus: 'failed',
        transcriptionAttempts: { lt: 5 },
      },
      select: { id: true },
    });

    for (const t of failed) {
      await this.prisma.testimony.update({
        where: { id: t.id },
        data: { transcriptionStatus: 'pending', transcriptionError: null },
      });
      void this.processTestimony(t.id).catch((err) =>
        this.logger.error(`Retry failed for ${t.id}:`, err),
      );
    }

    return {
      message: `Retrying ${failed.length} failed transcriptions`,
      count: failed.length,
    };
  }

  // ========== Helpers ==========

  private buildEmbeddingSections(
    testimony: {
      eventTitle: string;
      eventDescription: string | null;
      fullTestimony: string | null;
      transcript?: string | null;
    },
    transcript?: string,
  ) {
    const sections: EmbeddingSectionRequest[] = [
      { section: 'title', text: testimony.eventTitle ?? '' },
      { section: 'description', text: testimony.eventDescription ?? '' },
      { section: 'fullTestimony', text: testimony.fullTestimony ?? '' },
      { section: 'transcript', text: transcript ?? testimony.transcript ?? '' },
    ];
    return sections.filter((section) => section.text?.trim().length > 0);
  }

  private extractKeyPhrases(text: string) {
    const normalized = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length > 3);

    const stopWords = new Set([
      'this', 'that', 'have', 'with', 'from', 'about', 'were', 'there',
      'their', 'which', 'when', 'what', 'your', 'into', 'than', 'then',
      'them', 'they', 'because', 'been', 'also', 'only', 'will', 'would',
      'could', 'should', 'make', 'made', 'take', 'took', 'come', 'came',
      'know', 'knew', 'think', 'thought', 'said', 'told', 'like', 'just',
      'very', 'much', 'more', 'some', 'such', 'even', 'most', 'many',
      'these', 'those', 'other', 'being', 'does', 'done', 'going', 'want',
      'wanted',
    ]);

    const stem = (word: string): string => {
      if (word.endsWith('ies') && word.length > 4) return word.slice(0, -3) + 'y';
      if (word.endsWith('es') && word.length > 3) return word.slice(0, -2);
      if (word.endsWith('s') && word.length > 3) return word.slice(0, -1);
      if (word.endsWith('ing') && word.length > 5) return word.slice(0, -3);
      if (word.endsWith('ed') && word.length > 4) return word.slice(0, -2);
      return word;
    };

    const counts = new Map<string, { count: number; original: string }>();
    normalized.forEach((token) => {
      if (stopWords.has(token)) return;
      const stemmed = stem(token);
      const existing = counts.get(stemmed);
      if (existing) {
        existing.count++;
        if (token.length < existing.original.length) existing.original = token;
      } else {
        counts.set(stemmed, { count: 1, original: token });
      }
    });

    return [...counts.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 15)
      .map(([, value]) => value.original);
  }
}
