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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
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

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const response: AxiosResponse<EmbeddingResponse> =
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        await this.httpClient.post<EmbeddingResponse>(this.baseUrl, payload);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const raw = Array.isArray(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        response.data,
      )
        ? // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          response.data
        : // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          (response.data?.data ?? null);

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

      return vectors;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to fetch embeddings', errorMessage);
      throw error;
    }
  }
}
