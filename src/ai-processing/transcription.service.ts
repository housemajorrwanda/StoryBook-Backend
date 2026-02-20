import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosResponse } from 'axios';

interface TranscriptionResponse {
  text?: string;
  transcript?: string;
  data?: string;
  language?: string;
  duration?: number;
  confidence?: number;
  segments?: Array<{
    text: string;
    start: number;
    end: number;
    confidence?: number;
    words?: Array<{
      word: string;
      start: number;
      end: number;
      confidence?: number;
    }>;
  }>;
  lowConfidenceSegments?: Array<{
    text: string;
    confidence: number;
    start: number;
    end: number;
  }>;
  metadata?: {
    model: string;
    segmentCount: number;
    hasWordTimestamps: boolean;
    vadFilterApplied: boolean;
  };
}

interface CloudflareAiResponse {
  result: {
    text: string;
    word_count?: number;
    words?: Array<{ word: string; start: number; end: number }>;
    vtt?: string;
  };
  success: boolean;
  errors: Array<{ message: string }>;
}

@Injectable()
export class TranscriptionService {
  private readonly logger = new Logger(TranscriptionService.name);
  private readonly customTranscribeUrl: string | undefined;
  private readonly modelName: string;
  private readonly httpClient: AxiosInstance;

  // Cloudflare config (reused from embedding provider)
  private readonly cfAccountId?: string;
  private readonly cfApiToken?: string;
  private readonly cfWhisperModel: string;

  constructor(private readonly configService: ConfigService) {
    this.customTranscribeUrl =
      this.configService.get<string>('AI_TRANSCRIBE_URL');
    this.modelName =
      this.configService.get<string>('AI_TRANSCRIBE_MODEL') ?? 'large-v3';
    const timeout = this.configService.get<number>('AI_HTTP_TIMEOUT') ?? 120000;
    this.httpClient = axios.create({
      timeout,
      headers: { 'Content-Type': 'application/json' },
    });

    // Cloudflare credentials (same as embedding provider)
    this.cfAccountId = this.configService.get<string>('CLOUDFLARE_ACCOUNT_ID');
    this.cfApiToken = this.configService.get<string>('CLOUDFLARE_API_TOKEN');
    this.cfWhisperModel =
      this.configService.get<string>('AI_TRANSCRIBE_CF_MODEL') ??
      '@cf/openai/whisper-large-v3-turbo';

    if (this.customTranscribeUrl) {
      this.logger.log(
        `Transcription provider: custom server (${this.customTranscribeUrl})`,
      );
    } else if (this.cfAccountId && this.cfApiToken) {
      this.logger.log(
        `Transcription provider: Cloudflare Workers AI (${this.cfWhisperModel})`,
      );
    } else {
      this.logger.warn(
        'No transcription provider configured. Set AI_TRANSCRIBE_URL for custom server or CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN for Cloudflare.',
      );
    }
  }

  async transcribeFromUrl(
    sourceUrl: string,
    mediaDurationSeconds?: number,
    mediaType: 'audio' | 'video' = 'audio',
  ): Promise<string | null> {
    if (!sourceUrl) {
      this.logger.warn(
        `Cannot transcribe ${mediaType} testimony: source media URL is missing or invalid.`,
      );
      return null;
    }

    // Use custom server if configured, otherwise fall back to Cloudflare
    if (this.customTranscribeUrl) {
      return this.transcribeWithCustomServer(
        sourceUrl,
        mediaDurationSeconds,
        mediaType,
      );
    }

    if (this.cfAccountId && this.cfApiToken) {
      return this.transcribeWithCloudflare(sourceUrl, mediaType);
    }

    this.logger.warn(
      `No transcription provider available. Cannot transcribe ${mediaType} file. ` +
        `Configure CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN, or set AI_TRANSCRIBE_URL for a custom server.`,
    );
    return null;
  }

  // Max chunk size for Cloudflare Workers AI (~20MB to stay safely under 30MB limit)
  private readonly CF_MAX_CHUNK_BYTES = 20 * 1024 * 1024;

  /**
   * Transcribe using Cloudflare Workers AI Whisper model.
   * Downloads the file, converts to base64, and sends to Cloudflare.
   * For large files (>20MB), splits into chunks and transcribes each separately.
   */
  private async transcribeWithCloudflare(
    sourceUrl: string,
    mediaType: 'audio' | 'video',
  ): Promise<string | null> {
    // Step 1: Download the media file
    this.logger.log(
      `[Cloudflare] Downloading ${mediaType} file: ${sourceUrl.substring(0, 80)}...`,
    );

    const downloadResponse = await axios.get(sourceUrl, {
      responseType: 'arraybuffer',
      timeout: 300000, // 5 min download timeout
    });

    const fullBuffer = Buffer.from(downloadResponse.data as ArrayBuffer);
    const fileSizeMB = fullBuffer.length / (1024 * 1024);

    this.logger.log(
      `[Cloudflare] Downloaded ${fileSizeMB.toFixed(1)}MB.`,
    );

    // Step 2: Split into chunks if needed
    const chunks = this.splitBufferIntoChunks(fullBuffer, this.CF_MAX_CHUNK_BYTES);

    if (chunks.length > 1) {
      this.logger.log(
        `[Cloudflare] File is ${fileSizeMB.toFixed(1)}MB, splitting into ${chunks.length} chunks for transcription...`,
      );
    }

    // Step 3: Transcribe each chunk
    const transcripts: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunkSizeMB = chunks[i].length / (1024 * 1024);
      this.logger.log(
        `[Cloudflare] Transcribing chunk ${i + 1}/${chunks.length} (${chunkSizeMB.toFixed(1)}MB)...`,
      );

      const text = await this.transcribeChunkWithCloudflare(chunks[i], i + 1, chunks.length);

      if (text) {
        transcripts.push(text);
      }
    }

    if (transcripts.length === 0) {
      this.logger.warn(
        `[Cloudflare] All chunks returned empty transcripts for ${mediaType} file.`,
      );
      return null;
    }

    const fullText = transcripts.join(' ');
    this.logger.log(
      `[Cloudflare] Successfully transcribed ${mediaType} file. ` +
        `Total length: ${fullText.length} chars (${chunks.length} chunk${chunks.length > 1 ? 's' : ''}).`,
    );

    return fullText;
  }

  /**
   * Transcribe a single audio buffer chunk via Cloudflare Workers AI.
   * Includes retry logic with exponential backoff.
   */
  private async transcribeChunkWithCloudflare(
    chunk: Buffer,
    chunkNumber: number,
    totalChunks: number,
  ): Promise<string | null> {
    const url = `https://api.cloudflare.com/client/v4/accounts/${this.cfAccountId}/ai/run/${this.cfWhisperModel}`;
    const audioBase64 = chunk.toString('base64');
    const maxRetries = 3;
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          const delay = 1000 * Math.pow(2, attempt - 1);
          this.logger.log(
            `Retry ${attempt}/${maxRetries} for chunk ${chunkNumber}/${totalChunks} after ${delay}ms`,
          );
          await new Promise((r) => setTimeout(r, delay));
        }

        const response = await this.httpClient.post<CloudflareAiResponse>(
          url,
          { audio: audioBase64 },
          {
            headers: {
              Authorization: `Bearer ${this.cfApiToken}`,
              'Content-Type': 'application/json',
            },
            timeout: 600000, // 10 min per chunk
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
          },
        );

        if (!response.data?.success) {
          const errors = response.data?.errors
            ?.map((e) => e.message)
            .join(', ');
          throw new Error(`Cloudflare API error: ${errors || 'Unknown error'}`);
        }

        const text = response.data?.result?.text;

        if (!text || text.trim().length === 0) {
          this.logger.warn(
            `[Cloudflare] Chunk ${chunkNumber}/${totalChunks} returned empty transcript.`,
          );
          return null;
        }

        return text;
      } catch (error: unknown) {
        lastError = error;
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        if (attempt < maxRetries) {
          this.logger.warn(
            `[Cloudflare] Chunk ${chunkNumber}/${totalChunks} failed (attempt ${attempt}/${maxRetries}): ${errorMessage}. Retrying...`,
          );
        } else {
          this.logger.error(
            `[Cloudflare] Chunk ${chunkNumber}/${totalChunks} failed after ${maxRetries} attempts: ${errorMessage}`,
          );
        }
      }
    }

    // If all retries failed, throw so the caller can handle it
    if (lastError instanceof Error) {
      throw lastError;
    }
    throw new Error(String(lastError));
  }

  /**
   * Split a buffer into chunks of at most maxBytes.
   * Returns the original buffer in a single-element array if it's small enough.
   */
  private splitBufferIntoChunks(buffer: Buffer, maxBytes: number): Buffer[] {
    if (buffer.length <= maxBytes) {
      return [buffer];
    }

    const chunks: Buffer[] = [];
    let offset = 0;

    while (offset < buffer.length) {
      const end = Math.min(offset + maxBytes, buffer.length);
      chunks.push(buffer.subarray(offset, end));
      offset = end;
    }

    return chunks;
  }

  /**
   * Transcribe using a custom Whisper server (original behavior).
   * Used when AI_TRANSCRIBE_URL is set.
   */
  private async transcribeWithCustomServer(
    sourceUrl: string,
    mediaDurationSeconds?: number,
    mediaType: 'audio' | 'video' = 'audio',
  ): Promise<string | null> {
    // Calculate timeout based on media duration
    const baseTimeout =
      this.configService.get<number>('AI_HTTP_TIMEOUT') ?? 120000;
    let timeout = baseTimeout;

    if (mediaDurationSeconds) {
      const durationMinutes = mediaDurationSeconds / 60;
      if (durationMinutes > 120) {
        this.logger.warn(
          `Very long ${mediaType} file detected: ${durationMinutes.toFixed(1)} minutes. Transcription may take a significant amount of time or could timeout.`,
        );
      }

      const estimatedProcessingTime = mediaDurationSeconds * 2;
      const calculatedTimeout = (estimatedProcessingTime + 120) * 1000;
      const maxTimeout = 1200000; // 20 minutes
      timeout = Math.max(baseTimeout, Math.min(calculatedTimeout, maxTimeout));

      this.logger.log(
        `Transcribing ${mediaType}: ${mediaDurationSeconds}s (${durationMinutes.toFixed(1)} min) with timeout ${(timeout / 1000).toFixed(0)}s`,
      );
    } else {
      timeout = Math.max(baseTimeout, 300000);
      this.logger.warn(
        `No duration provided for ${mediaType} file. Using timeout of ${(timeout / 1000).toFixed(0)}s.`,
      );
    }

    try {
      const requestClient = axios.create({
        timeout,
        headers: { 'Content-Type': 'application/json' },
      });

      this.logger.log(
        `Sending transcription request for ${mediaType} file: ${sourceUrl.substring(0, 50)}...`,
      );

      const response: AxiosResponse<TranscriptionResponse> =
        await requestClient.post<TranscriptionResponse>(
          this.customTranscribeUrl!,
          {
            audioUrl: sourceUrl,
          },
        );

      const text =
        response.data?.text ??
        response.data?.transcript ??
        response.data?.data ??
        null;

      if (!text || (typeof text === 'string' && text.trim().length === 0)) {
        this.logger.warn(
          `Transcription service returned empty or null transcript for ${mediaType} file.`,
        );
        return null;
      }

      const confidence = response.data?.confidence;
      const detectedLanguage = response.data?.language;
      const lowConfidenceSegments = response.data?.lowConfidenceSegments || [];

      this.logger.log(
        `Successfully transcribed ${mediaType} file. Transcript length: ${String(text).length} characters.`,
      );

      if (detectedLanguage) {
        this.logger.log(`  Language detected: ${detectedLanguage}`);
      }

      if (confidence !== undefined && confidence !== null) {
        const confidenceLevel =
          confidence >= 90
            ? 'Excellent'
            : confidence >= 80
              ? 'Good'
              : confidence >= 70
                ? 'Fair'
                : 'Poor';
        this.logger.log(
          `  Transcription confidence: ${confidence.toFixed(1)}% (${confidenceLevel})`,
        );
      }

      if (lowConfidenceSegments.length > 0) {
        this.logger.warn(
          `  ${lowConfidenceSegments.length} segment(s) have confidence < 70%.`,
        );
      }

      const metadata = response.data?.metadata;
      if (metadata) {
        if (metadata.hasWordTimestamps) {
          this.logger.log('  Word-level timestamps enabled');
        }
        if (metadata.vadFilterApplied) {
          this.logger.log('  Voice Activity Detection (VAD) applied');
        }
      }

      return String(text);
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error) {
        const errorCode = error.code as string;

        if (errorCode === 'ECONNABORTED') {
          this.logger.error(
            `[TIMEOUT] Transcription request timed out after ${timeout / 1000}s for ${mediaType} file.`,
          );
        } else if (errorCode === 'ENOTFOUND' || errorCode === 'ECONNREFUSED') {
          this.logger.error(
            `[CONNECTION ERROR] Cannot connect to transcription server at ${this.customTranscribeUrl}. Error: ${errorCode}`,
          );
        } else if (errorCode === 'ECONNRESET') {
          this.logger.error(
            `[CONNECTION RESET] Transcription server closed the connection while processing ${mediaType} file.`,
          );
        }
      }

      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      }

      this.logger.error(
        `[TRANSCRIPTION FAILED] Failed to transcribe ${mediaType} file. Error: ${errorMessage}`,
      );

      return null;
    }
  }
}
