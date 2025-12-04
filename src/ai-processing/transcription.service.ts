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
    // Transcription typically takes 2x real-time processing, so we calculate:
    // 2x media duration + 60 seconds buffer for network/processing overhead
    // Minimum timeout: 120 seconds (for very short files)
    // Maximum timeout: 20 minutes (1,200,000ms) for very long files
    const baseTimeout =
      this.configService.get<number>('AI_HTTP_TIMEOUT') ?? 120000; // Default 2 minutes instead of 20s
    let timeout = baseTimeout;

    if (mediaDurationSeconds) {
      // Warn for very long files (>2 hours)
      const durationMinutes = mediaDurationSeconds / 60;
      if (durationMinutes > 120) {
        this.logger.warn(
          `Very long ${mediaType} file detected: ${durationMinutes.toFixed(1)} minutes. Transcription may take a significant amount of time or could timeout.`,
        );
      }

      // Calculate timeout: 2x real-time processing + 120 seconds buffer for safety
      // This accounts for: download time, transcription processing, and network latency
      const estimatedProcessingTime = mediaDurationSeconds * 2; // 2x real-time processing
      const calculatedTimeout = (estimatedProcessingTime + 120) * 1000; // Add 120s buffer, convert to ms

      // Use the higher of: base timeout or calculated timeout, but cap at 20 minutes
      const maxTimeout = 1200000; // 20 minutes
      timeout = Math.max(baseTimeout, Math.min(calculatedTimeout, maxTimeout));

      this.logger.log(
        `Transcribing ${mediaType}: ${mediaDurationSeconds}s (${durationMinutes.toFixed(1)} min) with timeout ${(timeout / 1000).toFixed(0)}s (estimated processing: ~${estimatedProcessingTime.toFixed(0)}s)`,
      );

      // Warn if file might still timeout (shouldn't happen with new calculation, but keep for safety)
      if (estimatedProcessingTime + 60 > timeout / 1000) {
        const maxSupportedDuration = ((timeout / 1000 - 120) / 2).toFixed(0);
        this.logger.warn(
          `Warning: ${mediaType} file (${mediaDurationSeconds}s) may exceed timeout. Maximum reliably supported duration: ~${maxSupportedDuration} seconds (~${(Number(maxSupportedDuration) / 60).toFixed(1)} minutes)`,
        );
      }
    } else {
      // No duration provided - use a generous default timeout
      timeout = Math.max(baseTimeout, 300000); // At least 5 minutes if no duration
      this.logger.warn(
        `No duration provided for ${mediaType} file. Using timeout of ${(timeout / 1000).toFixed(0)}s. This may cause timeouts for longer files.`,
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

      const response: AxiosResponse<TranscriptionResponse> =
        await requestClient.post<TranscriptionResponse>(this.baseUrl, {
          audioUrl: sourceUrl,
        });

      const text =
        response.data?.text ??
        response.data?.transcript ??
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
              `Possible causes: 1) File too long (max reliably supported: ~${(timeout / 1000 / 2 / 60).toFixed(1)} min), ` +
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
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      }

      // Check for connection closed errors (499-like behavior)
      const errorMessageLower = errorMessage.toLowerCase();
      const isConnectionClosed =
        errorMessageLower.includes('closed') ||
        errorMessageLower.includes('canceled') ||
        errorMessageLower.includes('aborted') ||
        errorMessageLower.includes('econnreset') ||
        (error && typeof error === 'object' && 'response' in error);

      // Check if it's an HTTP error response (e.g., 499, 504)
      let httpStatus: number | undefined;
      if (
        error &&
        typeof error === 'object' &&
        'response' in error &&
        error.response &&
        typeof error.response === 'object' &&
        'status' in error.response
      ) {
        httpStatus = Number(error.response.status);
      }

      if (httpStatus === 499 || (isConnectionClosed && !httpStatus)) {
        const durationMinutes = mediaDurationSeconds
          ? (mediaDurationSeconds / 60).toFixed(1)
          : 'unknown';
        this.logger.error(
          `[CONNECTION CLOSED] Client or proxy closed connection before transcription completed for ${mediaType} file (${durationMinutes} min). ` +
            `This often happens when: 1) Request exceeds Railway/proxy timeout limits (typically 60-120s), ` +
            `2) Client timeout is too short, 3) Network interruption. ` +
            `Transcription may have completed on the server. Consider checking transcription server logs. ` +
            `Current timeout was ${(timeout / 1000).toFixed(0)}s.`,
        );
      } else if (httpStatus === 504 || httpStatus === 502) {
        this.logger.error(
          `[GATEWAY TIMEOUT] Proxy or gateway timed out while waiting for transcription service. ` +
            `The transcription service may still be processing. Consider: 1) Increasing proxy timeout, ` +
            `2) Making transcription truly async with a job queue, 3) Checking transcription server status.`,
        );
      } else {
        this.logger.error(
          `[TRANSCRIPTION FAILED] Failed to transcribe ${mediaType} file (${mediaDurationSeconds ? `${(mediaDurationSeconds / 60).toFixed(1)} min` : 'unknown duration'}). ` +
            `Error details: ${errorMessage}. File URL: ${sourceUrl.substring(0, 100)}...`,
        );
      }

      return null;
    }
  }
}
