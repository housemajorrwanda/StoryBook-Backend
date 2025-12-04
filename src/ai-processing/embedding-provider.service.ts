import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosResponse } from 'axios';

export interface EmbeddingSectionRequest {
  section: string;
  text: string;
}

interface EmbeddingItem {
  embedding?: number[];
  vector?: number[];
  data?: number[];
}

type EmbeddingResponse = EmbeddingItem[] | { data: EmbeddingItem[] };

@Injectable()
export class EmbeddingProviderService {
  private readonly logger = new Logger(EmbeddingProviderService.name);
  private readonly baseUrl: string;
  private readonly modelName: string;
  private readonly httpClient: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl =
      this.configService.get<string>('AI_EMBEDDING_URL') ??
      'http://localhost:8081/embeddings';
    this.modelName =
      this.configService.get<string>('AI_EMBEDDING_MODEL') ??
      'nomic-embed-text';
    const timeout = this.configService.get<number>('AI_HTTP_TIMEOUT') ?? 20000;
    this.httpClient = axios.create({
      timeout,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  getModelName() {
    return this.modelName;
  }

  async embedSections(sections: EmbeddingSectionRequest[]) {
    if (!this.baseUrl) {
      throw new Error('AI_EMBEDDING_URL is not configured');
    }

    const validSections = sections.filter(
      (section) => section.text && section.text.trim().length > 0,
    );
    if (validSections.length === 0) {
      return {};
    }

    const payload = {
      model: this.modelName,
      input: validSections.map((section) => section.text),
    };

    // Retry logic for Ollama (in case it's "sleeping" / idle)
    const maxRetries = 3;
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          const delay = 1000 * attempt; // 2s, 3s delays
          this.logger.log(
            `Retrying embedding request (attempt ${attempt}/${maxRetries}) after ${delay}ms delay...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        this.logger.log(
          `Requesting embeddings for ${validSections.length} sections (attempt ${attempt}/${maxRetries})...`,
        );

        const response: AxiosResponse<EmbeddingResponse> =
          await this.httpClient.post<EmbeddingResponse>(this.baseUrl, payload);

        const raw = Array.isArray(response.data)
          ? response.data
          : (response.data?.data ?? null);

        if (!Array.isArray(raw)) {
          throw new Error('Embedding provider returned unexpected payload');
        }

        const vectors: Record<string, number[]> = {};
        raw.forEach((item: EmbeddingItem, index) => {
          const vector =
            item?.embedding ?? item?.vector ?? item?.data ?? undefined;
          if (!Array.isArray(vector)) {
            this.logger.warn(
              `Missing embedding vector for section ${validSections[index].section}`,
            );
            return;
          }
          vectors[validSections[index].section] = vector;
        });

        this.logger.log(
          `Successfully generated embeddings for ${Object.keys(vectors).length} sections`,
        );
        return vectors;
      } catch (error: unknown) {
        lastError = error;
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        const statusCode =
          error && typeof error === 'object' && 'response' in error
            ? (error as { response?: { status?: number } }).response?.status
            : undefined;

        if (attempt < maxRetries) {
          this.logger.warn(
            `Embedding request failed (attempt ${attempt}/${maxRetries}): ${errorMessage}${statusCode ? ` (HTTP ${statusCode})` : ''}. Retrying...`,
          );
        } else {
          this.logger.error(
            `Failed to fetch embeddings after ${maxRetries} attempts: ${errorMessage}${statusCode ? ` (HTTP ${statusCode})` : ''}`,
          );
          if (statusCode === 500 || statusCode === 503) {
            this.logger.warn(
              'Ollama may be idle/sleeping. Consider: 1) Checking Ollama service status, 2) Sending a health check request to wake it up, 3) Increasing Ollama timeout settings.',
            );
          }
        }
      }
    }

    // If we get here, all retries failed
    throw lastError;
  }
}
