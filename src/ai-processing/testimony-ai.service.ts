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
    this.logger.log(`Starting AI processing for testimony ${testimonyId}`);
    try {
      const testimony = await this.prisma.testimony.findUnique({
        where: { id: testimonyId },
      });

      if (!testimony) {
        this.logger.warn(`Testimony ${testimonyId} not found for AI process`);
        return;
      }

      this.logger.log(
        `Testimony ${testimonyId} found: type=${testimony.submissionType}, hasTranscript=${!!testimony.transcript}, audioUrl=${!!testimony.audioUrl}, videoUrl=${!!testimony.videoUrl}`,
      );

      let transcript = testimony.transcript ?? undefined;
      const needsTranscript =
        !transcript &&
        ['audio', 'video'].includes(testimony.submissionType ?? '');

      this.logger.log(
        `Testimony ${testimonyId} transcription check: needsTranscript=${needsTranscript}, submissionType=${testimony.submissionType}, hasTranscript=${!!transcript}`,
      );

      if (needsTranscript) {
        this.logger.log(
          `Starting transcription for testimony ${testimonyId} (${testimony.submissionType})`,
        );
        const mediaUrl = testimony.audioUrl ?? testimony.videoUrl ?? null;
        const mediaType =
          testimony.submissionType === 'video' ? 'video' : 'audio';
        // Get duration - audio for audio files, video for video files
        const mediaDurationSeconds =
          testimony.submissionType === 'video'
            ? (testimony.videoDuration ?? undefined)
            : (testimony.audioDuration ?? undefined);

        if (!mediaUrl) {
          this.logger.warn(
            `Cannot transcribe testimony ${testimonyId}: No media URL found. audioUrl=${!!testimony.audioUrl}, videoUrl=${!!testimony.videoUrl}`,
          );
        } else {
          this.logger.log(
            `Calling transcription service for testimony ${testimonyId}: mediaUrl=${mediaUrl.substring(0, 50)}..., duration=${mediaDurationSeconds ? `${(mediaDurationSeconds / 60).toFixed(1)} min` : 'unknown'}, type=${mediaType}`,
          );
          try {
            const newTranscript =
              await this.transcriptionService.transcribeFromUrl(
                mediaUrl,
                mediaDurationSeconds,
                mediaType,
              );
            this.logger.log(
              `Transcription service returned for testimony ${testimonyId}: ${
                newTranscript
                  ? `transcript length=${newTranscript.length}`
                  : 'null/empty'
              }`,
            );

            if (newTranscript) {
              transcript = newTranscript;
              this.logger.log(
                `Successfully generated transcript for ${mediaType} testimony ${testimonyId}`,
              );
            } else {
              this.logger.warn(
                `Transcription service returned null/empty for ${mediaType} testimony ${testimonyId}. ` +
                  `Media URL: ${mediaUrl ? 'present' : 'missing'}, Duration: ${mediaDurationSeconds ? `${(mediaDurationSeconds / 60).toFixed(1)} min` : 'unknown'}. ` +
                  `Check transcription service logs for details.`,
              );
            }
          } catch (transcriptionError) {
            this.logger.error(
              `Transcription failed for testimony ${testimonyId}:`,
              transcriptionError instanceof Error
                ? transcriptionError
                : new Error(String(transcriptionError)),
            );
            // Continue processing even if transcription fails
          }
        }
      } else {
        this.logger.log(
          `Skipping transcription for testimony ${testimonyId}: needsTranscript=false (hasTranscript=${!!transcript}, submissionType=${testimony.submissionType})`,
        );
      }

      // Save transcript FIRST, independently of embeddings
      // This ensures transcript is saved even if embeddings fail
      const updateData: Record<string, unknown> = {};

      if (transcript && transcript !== testimony.transcript) {
        updateData.transcript = transcript;
        this.logger.log(
          `Preparing to save transcript for testimony ${testimonyId} (length: ${transcript.length})`,
        );
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

      // Save transcript and metadata FIRST (even if embeddings fail)
      if (Object.keys(updateData).length > 0) {
        try {
          await this.prisma.testimony.update({
            where: { id: testimonyId },
            data: updateData,
          });
          this.logger.log(
            `Successfully saved transcript and metadata for testimony ${testimonyId}`,
          );
        } catch (updateError) {
          this.logger.error(
            `Failed to save transcript for testimony ${testimonyId}:`,
            updateError instanceof Error
              ? updateError
              : new Error(String(updateError)),
          );
          // Don't throw - continue to try embeddings
        }
      }

      // Now try embeddings (separate from transcript saving)
      const sections = this.buildEmbeddingSections(testimony, transcript);
      if (sections.length === 0) {
        this.logger.warn(
          `Skipping embeddings for testimony ${testimonyId} - no text content`,
        );
        return;
      }

      try {
        this.logger.log(
          `Starting embedding generation for testimony ${testimonyId} (${sections.length} sections)`,
        );
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
          this.logger.log(
            `Successfully saved embeddings for testimony ${testimonyId} (${entries.length} sections)`,
          );
        } else {
          this.logger.warn(
            `No embedding vectors generated for testimony ${testimonyId}`,
          );
        }
      } catch (embeddingError) {
        this.logger.error(
          `Failed to generate/save embeddings for testimony ${testimonyId}:`,
          embeddingError instanceof Error
            ? embeddingError
            : new Error(String(embeddingError)),
        );
        // Don't throw - transcript is already saved, embeddings can be retried later
        this.logger.warn(
          `Testimony ${testimonyId} transcript saved successfully, but embeddings failed. Embeddings can be regenerated later.`,
        );
      }

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

    // Expanded stopwords list for better filtering
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
      'make',
      'made',
      'take',
      'took',
      'come',
      'came',
      'know',
      'knew',
      'think',
      'thought',
      'said',
      'told',
      'like',
      'just',
      'very',
      'much',
      'more',
      'some',
      'such',
      'even',
      'most',
      'many',
      'these',
      'those',
      'other',
      'being',
      'does',
      'done',
      'going',
      'want',
      'wanted',
    ]);

    // Simple stemming - remove common suffixes (basic lemmatization)
    const stem = (word: string): string => {
      // Remove plurals
      if (word.endsWith('ies') && word.length > 4) {
        return word.slice(0, -3) + 'y';
      }
      if (word.endsWith('es') && word.length > 3) {
        return word.slice(0, -2);
      }
      if (word.endsWith('s') && word.length > 3) {
        return word.slice(0, -1);
      }
      // Remove -ing
      if (word.endsWith('ing') && word.length > 5) {
        return word.slice(0, -3);
      }
      // Remove -ed
      if (word.endsWith('ed') && word.length > 4) {
        return word.slice(0, -2);
      }
      return word;
    };

    const counts = new Map<string, { count: number; original: string }>();

    normalized.forEach((token) => {
      if (stopWords.has(token)) {
        return;
      }

      // Apply stemming to group related words
      const stemmed = stem(token);

      const existing = counts.get(stemmed);
      if (existing) {
        existing.count++;
        // Keep the shorter version as canonical
        if (token.length < existing.original.length) {
          existing.original = token;
        }
      } else {
        counts.set(stemmed, { count: 1, original: token });
      }
    });

    // Sort by frequency and return top key phrases
    return [...counts.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 15) // Increased from 10 to 15 for better coverage
      .map(([, value]) => value.original);
  }
}
