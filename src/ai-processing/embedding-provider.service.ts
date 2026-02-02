import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface EmbeddingSectionRequest {
  section: string;
  text: string;
}

@Injectable()
export class EmbeddingProviderService {
  private readonly logger = new Logger(EmbeddingProviderService.name);
  private readonly provider: 'cloudflare' | 'ollama';
  private readonly modelName: string;
  private readonly httpClient: AxiosInstance;

  // Cloudflare config
  private readonly cfAccountId?: string;
  private readonly cfApiToken?: string;

  // Ollama config (legacy)
  private readonly ollamaUrl?: string;

  constructor(private readonly configService: ConfigService) {
    this.provider =
      (this.configService.get<string>('AI_EMBEDDING_PROVIDER') as
        | 'cloudflare'
        | 'ollama') ?? 'cloudflare';

    const timeout = this.configService.get<number>('AI_HTTP_TIMEOUT') ?? 20000;
    this.httpClient = axios.create({
      timeout,
      headers: { 'Content-Type': 'application/json' },
    });

    if (this.provider === 'cloudflare') {
      this.cfAccountId = this.configService.get<string>(
        'CLOUDFLARE_ACCOUNT_ID',
      );
      this.cfApiToken = this.configService.get<string>('CLOUDFLARE_API_TOKEN');
      this.modelName =
        this.configService.get<string>('AI_EMBEDDING_MODEL') ??
        '@cf/baai/bge-base-en-v1.5';

      if (!this.cfAccountId || !this.cfApiToken) {
        this.logger.warn(
          'Cloudflare credentials missing: CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required',
        );
      }
    } else {
      this.ollamaUrl =
        this.configService.get<string>('AI_EMBEDDING_URL') ??
        'http://localhost:8085/embeddings';
      this.modelName =
        this.configService.get<string>('AI_EMBEDDING_MODEL') ??
        'nomic-embed-text';
    }

    this.logger.log(
      `Embedding provider: ${this.provider}, model: ${this.modelName}`,
    );
  }

  getModelName() {
    return this.modelName;
  }

  async embedSections(sections: EmbeddingSectionRequest[]) {
    const validSections = sections.filter(
      (section) => section.text && section.text.trim().length > 0,
    );
    if (validSections.length === 0) {
      return {};
    }

    if (this.provider === 'cloudflare') {
      return this.embedWithCloudflare(validSections);
    }
    return this.embedWithOllama(validSections);
  }

  private async embedWithCloudflare(
    sections: EmbeddingSectionRequest[],
  ): Promise<Record<string, number[]>> {
    if (!this.cfAccountId || !this.cfApiToken) {
      throw new Error(
        'Cloudflare credentials not configured: CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN required',
      );
    }

    const url = `https://api.cloudflare.com/client/v4/accounts/${this.cfAccountId}/ai/run/${this.modelName}`;
    const texts = sections.map((s) => s.text);

    const maxRetries = 3;
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          const delay = 1000 * attempt;
          this.logger.log(
            `Retrying Cloudflare embedding request (attempt ${attempt}/${maxRetries}) after ${delay}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        this.logger.log(
          `Requesting embeddings for ${sections.length} sections via Cloudflare (attempt ${attempt}/${maxRetries})...`,
        );

        const response = await this.httpClient.post(
          url,
          { text: texts },
          {
            headers: {
              Authorization: `Bearer ${this.cfApiToken}`,
              'Content-Type': 'application/json',
            },
          },
        );

        const result = response.data?.result;
        if (!result?.data || !Array.isArray(result.data)) {
          throw new Error(
            'Cloudflare returned unexpected response: missing result.data array',
          );
        }

        const vectors: Record<string, number[]> = {};
        result.data.forEach((embedding: number[], index: number) => {
          if (!Array.isArray(embedding)) {
            this.logger.warn(
              `Missing embedding vector for section ${sections[index].section}`,
            );
            return;
          }
          vectors[sections[index].section] = embedding;
        });

        this.logger.log(
          `Successfully generated ${Object.keys(vectors).length} embeddings via Cloudflare (dim: ${result.data[0]?.length ?? 'unknown'})`,
        );
        return vectors;
      } catch (error: unknown) {
        lastError = error;
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        if (attempt < maxRetries) {
          this.logger.warn(
            `Cloudflare embedding request failed (attempt ${attempt}/${maxRetries}): ${errorMessage}. Retrying...`,
          );
        } else {
          this.logger.error(
            `Failed to fetch embeddings from Cloudflare after ${maxRetries} attempts: ${errorMessage}`,
          );
        }
      }
    }

    throw lastError;
  }

  private async embedWithOllama(
    sections: EmbeddingSectionRequest[],
  ): Promise<Record<string, number[]>> {
    if (!this.ollamaUrl) {
      throw new Error('AI_EMBEDDING_URL is not configured');
    }

    const payload = {
      model: this.modelName,
      input: sections.map((section) => section.text),
    };

    // Wake up Ollama
    try {
      const healthUrl = this.ollamaUrl.replace('/embeddings', '/health');
      await this.httpClient.get(healthUrl, { timeout: 3000 }).catch(() => {});
    } catch {
      // ignore
    }

    const maxRetries = 3;
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          const delay = 1000 * attempt;
          this.logger.log(
            `Retrying Ollama embedding request (attempt ${attempt}/${maxRetries}) after ${delay}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          // Wake up again
          try {
            const healthUrl = this.ollamaUrl.replace('/embeddings', '/health');
            await this.httpClient
              .get(healthUrl, { timeout: 3000 })
              .catch(() => {});
          } catch {
            // ignore
          }
        }

        this.logger.log(
          `Requesting embeddings for ${sections.length} sections via Ollama (attempt ${attempt}/${maxRetries})...`,
        );

        const response = await this.httpClient.post(this.ollamaUrl, payload);

        const raw = Array.isArray(response.data)
          ? response.data
          : (response.data?.data ?? null);

        if (!Array.isArray(raw)) {
          throw new Error('Embedding provider returned unexpected payload');
        }

        const vectors: Record<string, number[]> = {};
        raw.forEach(
          (
            item: { embedding?: number[]; vector?: number[]; data?: number[] },
            index: number,
          ) => {
            const vector = item?.embedding ?? item?.vector ?? item?.data;
            if (!Array.isArray(vector)) {
              this.logger.warn(
                `Missing embedding vector for section ${sections[index].section}`,
              );
              return;
            }
            vectors[sections[index].section] = vector;
          },
        );

        this.logger.log(
          `Successfully generated embeddings for ${Object.keys(vectors).length} sections`,
        );
        return vectors;
      } catch (error: unknown) {
        lastError = error;
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        if (attempt < maxRetries) {
          this.logger.warn(
            `Ollama embedding request failed (attempt ${attempt}/${maxRetries}): ${errorMessage}. Retrying...`,
          );
        } else {
          this.logger.error(
            `Failed to fetch embeddings from Ollama after ${maxRetries} attempts: ${errorMessage}`,
          );
        }
      }
    }

    throw lastError;
  }
}
