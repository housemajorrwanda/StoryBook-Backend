import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  EmbeddingProviderService,
  EmbeddingSectionRequest,
} from './embedding-provider.service';
import { TranscriptionService } from './transcription.service';
import { TestimonyConnectionService } from './testimony-connection.service';

@Injectable()
export class TestimonyAiService {
  private readonly logger = new Logger(TestimonyAiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingProvider: EmbeddingProviderService,
    private readonly transcriptionService: TranscriptionService,
    private readonly connectionService: TestimonyConnectionService,
  ) {}

  async processTestimony(testimonyId: number) {
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

      if (needsTranscript) {
        const mediaUrl = testimony.audioUrl ?? testimony.videoUrl ?? null;
        const newTranscript = mediaUrl
          ? await this.transcriptionService.transcribeFromUrl(mediaUrl)
          : null;

        if (newTranscript) {
          transcript = newTranscript;
        }
      }

      const sections = this.buildEmbeddingSections(testimony, transcript);
      if (sections.length === 0) {
        this.logger.warn(
          `Skipping embeddings for testimony ${testimonyId} - no text content`,
        );
        return;
      }

      const vectors = await this.embeddingProvider.embedSections(sections);
      const entries = Object.entries(vectors);

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

      await this.prisma.$transaction(async (tx) => {
        if (entries.length > 0) {
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
        }

        if (Object.keys(updateData).length > 0) {
          await tx.testimony.update({
            where: { id: testimonyId },
            data: updateData,
          });
        }
      });

      this.logger.log(`Finished AI processing for testimony ${testimonyId}`);

      // Discover connections with other testimonies
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
      {
        section: 'title',
        text: testimony.eventTitle ?? '',
      },
      {
        section: 'description',
        text: testimony.eventDescription ?? '',
      },
      {
        section: 'fullTestimony',
        text: testimony.fullTestimony ?? '',
      },
      {
        section: 'transcript',
        text: transcript ?? testimony.transcript ?? '',
      },
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
      'this',
      'that',
      'have',
      'with',
      'from',
      'about',
      'were',
      'there',
      'their',
      'which',
      'when',
      'what',
      'your',
      'into',
      'than',
      'then',
      'them',
      'they',
      'because',
      'been',
      'also',
      'only',
      'will',
      'would',
      'could',
      'should',
    ]);

    const counts = new Map<string, number>();
    normalized.forEach((token) => {
      if (stopWords.has(token)) {
        return;
      }
      counts.set(token, (counts.get(token) ?? 0) + 1);
    });

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([token]) => token);
  }
}
