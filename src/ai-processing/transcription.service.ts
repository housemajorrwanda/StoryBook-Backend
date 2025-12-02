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

  async transcribeFromUrl(
    sourceUrl: string,
    mediaDurationSeconds?: number,
    mediaType: 'audio' | 'video' = 'audio',
  ): Promise<string | null> {
    if (!this.baseUrl) {
      this.logger.warn(
        `AI_TRANSCRIBE_URL not configured. Cannot transcribe ${mediaType} files. Please set AI_TRANSCRIBE_URL environment variable.`,
      );
      return null;
    }

    if (!sourceUrl) {
      this.logger.warn(
        `Cannot transcribe ${mediaType} testimony: source media URL is missing or invalid.`,
      );
      return null;
    }

    // Calculate timeout based on media duration
    // Formula: 5 seconds per minute + 60 seconds base buffer
    // Minimum timeout: 60 seconds (for files < 1 minute)
    // Maximum timeout: 15 minutes (900,000ms) for very long files
    // Files longer than ~2.8 hours (168 minutes) will hit the max timeout
    const baseTimeout =
      this.configService.get<number>('AI_HTTP_TIMEOUT') ?? 20000;
    let timeout = baseTimeout;

    if (mediaDurationSeconds) {
      // Warn for very long files (>2 hours)
      const durationMinutes = mediaDurationSeconds / 60;
      if (durationMinutes > 120) {
        this.logger.warn(
          `Very long ${mediaType} file detected: ${durationMinutes.toFixed(1)} minutes. Transcription may take a significant amount of time or could timeout.`,
        );
      }

      // Calculate timeout: 5 seconds per minute + 60 seconds buffer
      const calculatedTimeout =
        Math.ceil(mediaDurationSeconds / 60) * 5000 + 60000;
      
      // Use the higher of: base timeout or calculated timeout, but cap at 15 minutes
      timeout = Math.max(baseTimeout, Math.min(calculatedTimeout, 900000));
      
      this.logger.log(
        `Transcribing ${mediaType}: ${mediaDurationSeconds}s (${durationMinutes.toFixed(1)} min) with timeout ${(timeout / 1000).toFixed(0)}s`,
      );

      // Warn if file might still timeout
      // If transcription typically takes 2x the media duration, we need at least that
      const estimatedProcessingTime = mediaDurationSeconds * 2; // 2x real-time processing
      if (estimatedProcessingTime > timeout / 1000) {
        const maxSupportedDuration = (timeout / 1000 / 2).toFixed(0);
        this.logger.warn(
          `Warning: ${mediaType} file (${mediaDurationSeconds}s) may exceed timeout. Maximum reliably supported duration: ~${maxSupportedDuration} seconds (~${(Number(maxSupportedDuration) / 60).toFixed(1)} minutes)`,
        );
      }
    } else {
      this.logger.warn(
        `No duration provided for ${mediaType} file. Using default timeout of ${baseTimeout}ms. This may cause timeouts for longer files.`,
      );
    }

    try {
      // Create a client with dynamic timeout for this request
      const requestClient = axios.create({
        timeout,
        headers: { 'Content-Type': 'application/json' },
      });

      this.logger.log(
        `Sending transcription request for ${mediaType} file: ${sourceUrl.substring(0, 50)}...`,
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const response: AxiosResponse<TranscriptionResponse> =
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        await requestClient.post<TranscriptionResponse>(this.baseUrl, {
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

      if (!text || (typeof text === 'string' && text.trim().length === 0)) {
        this.logger.warn(
          `Transcription service returned empty or null transcript for ${mediaType} file. This may indicate: 1) Silent audio/video, 2) Unsupported format, 3) Processing error on transcription server.`,
        );
        return null;
      }

      this.logger.log(
        `Successfully transcribed ${mediaType} file. Transcript length: ${String(text).length} characters.`,
      );
      return String(text);
    } catch (error: unknown) {
      // Enhanced error handling with detailed messages
      if (error && typeof error === 'object' && 'code' in error) {
        const errorCode = error.code as string;

        if (errorCode === 'ECONNABORTED') {
          const timeoutSeconds = timeout / 1000;
          const durationMinutes = mediaDurationSeconds
            ? (mediaDurationSeconds / 60).toFixed(1)
            : 'unknown';
          this.logger.error(
            `[TIMEOUT] Transcription request timed out after ${timeoutSeconds}s for ${mediaType} file (${durationMinutes} min). ` +
              `Possible causes: 1) File too long (max reliably supported: ~${((timeout / 1000 / 2) / 60).toFixed(1)} min), ` +
              `2) Transcription server overloaded, 3) Network issues. Consider: splitting the file, increasing AI_HTTP_TIMEOUT, or checking transcription server logs.`,
          );
        } else if (errorCode === 'ENOTFOUND' || errorCode === 'ECONNREFUSED') {
          this.logger.error(
            `[CONNECTION ERROR] Cannot connect to transcription server at ${this.baseUrl}. ` +
              `Check: 1) AI_TRANSCRIBE_URL is correct, 2) Transcription server is running, 3) Network connectivity. Error: ${errorCode}`,
          );
        } else if (errorCode === 'ECONNRESET') {
          this.logger.error(
            `[CONNECTION RESET] Transcription server closed the connection while processing ${mediaType} file. ` +
              `This may indicate: 1) Server crash/restart, 2) Resource exhaustion, 3) File format issue. Check transcription server logs.`,
          );
        }
      }

      // Extract detailed error message
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (
        error &&
        typeof error === 'object' &&
        'message' in error
      ) {
        errorMessage = String(error.message);
      }

      this.logger.error(
        `[TRANSCRIPTION FAILED] Failed to transcribe ${mediaType} file (${mediaDurationSeconds ? `${(mediaDurationSeconds / 60).toFixed(1)} min` : 'unknown duration'}). ` +
          `Error details: ${errorMessage}. File URL: ${sourceUrl.substring(0, 100)}...`,
      );

      return null;
    }
  }
}
