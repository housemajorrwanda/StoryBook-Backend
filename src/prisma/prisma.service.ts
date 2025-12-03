import {
  Injectable,
  OnModuleInit,
  Logger,
  OnModuleDestroy,
  Optional,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private connectionRetries = 0;
  private readonly maxRetries = 5;

  constructor(@Optional() private configService?: ConfigService) {
    // Get database URL with pooling parameters before calling super
    const databaseUrl = PrismaService.getDatabaseUrlWithPooling();

    super({
      log:
        process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
      datasources: databaseUrl
        ? {
            db: {
              url: databaseUrl,
            },
          }
        : undefined,
    });
  }

  /**
   * Add connection pooling parameters to DATABASE_URL for Railway
   * This helps prevent "Connection reset by peer" errors
   * Static method to avoid 'this' access before super()
   */
  private static getDatabaseUrlWithPooling(): string | undefined {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      return undefined;
    }

    // If URL already has query parameters, append to them
    // Otherwise add new query parameters
    const hasQueryParams = databaseUrl.includes('?');
    const separator = hasQueryParams ? '&' : '?';

    // Connection pooling parameters for Railway/PostgreSQL
    const poolParams = [
      'connection_limit=10', // Limit concurrent connections
      'pool_timeout=20', // Timeout for getting connection from pool
      'connect_timeout=10', // Connection timeout in seconds
      'pgbouncer=true', // Enable pgbouncer compatibility (if using connection pooler)
    ].join('&');

    return `${databaseUrl}${separator}${poolParams}`;
  }

  async onModuleInit() {
    await this.connectWithRetry();
  }

  /**
   * Connect to database with retry logic for Railway deployments
   */
  private async connectWithRetry(): Promise<void> {
    while (this.connectionRetries < this.maxRetries) {
      try {
        await this.$connect();
        this.logger.log('Successfully connected to database');
        this.connectionRetries = 0; // Reset on success
        return;
      } catch (error) {
        this.connectionRetries++;
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';

        if (this.connectionRetries >= this.maxRetries) {
          this.logger.error(
            `Failed to connect to database after ${this.maxRetries} attempts:`,
            errorMessage,
          );
          this.logger.warn(
            'Application will start, but database operations may fail. ' +
              'Connection will be retried on first query.',
          );
          return;
        }

        const delay = Math.min(
          1000 * Math.pow(2, this.connectionRetries),
          10000,
        ); // Exponential backoff, max 10s
        this.logger.warn(
          `Database connection attempt ${this.connectionRetries}/${this.maxRetries} failed. Retrying in ${delay}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Check if error is a connection error that should trigger retry
   */
  private isConnectionError(error: unknown): boolean {
    if (!error) {
      return false;
    }

    const errorString =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : JSON.stringify(error);
    const connectionErrors = [
      'Connection reset by peer',
      "Can't reach database server",
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'Connection closed',
      'PrismaClientInitializationError',
      'P1001', // Prisma error code for unreachable database
    ];

    return connectionErrors.some((err) => errorString.includes(err));
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('Disconnected from database');
    } catch (error) {
      this.logger.warn('Error disconnecting from database:', error);
    }
  }
}
