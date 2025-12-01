import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosResponse } from 'axios';

interface TranscriptionResponse {
  text?: string;
  transcript?: string;
  data?: string;
}

@Injectable()
export class TranscriptionService {
  private readonly logger = new Logger(TranscriptionService.name);
  private readonly baseUrl: string | undefined;
  private readonly modelName: string;
  private readonly httpClient: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('AI_TRANSCRIBE_URL');
    this.modelName =
      this.configService.get<string>('AI_TRANSCRIBE_MODEL') ?? 'large-v3';
    const timeout = this.configService.get<number>('AI_HTTP_TIMEOUT') ?? 20000;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    this.httpClient = axios.create({
      timeout,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async transcribeFromUrl(sourceUrl: string) {
    if (!this.baseUrl) {
      this.logger.warn(
        'AI_TRANSCRIBE_URL not set, skipping audio/video transcription',
      );
      return null;
    }

    if (!sourceUrl) {
      this.logger.warn('Cannot transcribe testimony without source media URL');
      return null;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const response: AxiosResponse<TranscriptionResponse> =
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        await this.httpClient.post<TranscriptionResponse>(this.baseUrl, {
          audioUrl: sourceUrl,
          // Note: Model is configured in transcription server, not sent in request
        });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const text =
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        response.data?.text ??
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        response.data?.transcript ??
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        response.data?.data ??
        null;

      if (!text) {
        this.logger.warn('Transcription service returned empty text');
        return null;
      }

      return String(text);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to transcribe media', errorMessage);
      return null;
    }
  }
}
