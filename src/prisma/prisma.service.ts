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
   * Get database URL - use as-is from environment
   * Prisma handles connection pooling internally, we don't need to add parameters
   * Static method to avoid 'this' access before super()
   */
  private static getDatabaseUrlWithPooling(): string | undefined {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      return undefined;
    }

    // Return the DATABASE_URL as-is
    // Prisma handles connection pooling internally
    // Adding query parameters to PostgreSQL connection strings can cause errors
    // like "unrecognized configuration parameter"
    return databaseUrl;
  }

  async onModuleInit() {
    await this.connectWithRetry();
  }

  /**
   * Connect to database with retry logic for Neon/Railway deployments
   */
  private async connectWithRetry(): Promise<void> {
    while (this.connectionRetries < this.maxRetries) {
      try {
        // Disconnect first if connection exists but is stale
        try {
          await this.$disconnect();
        } catch {
          // Ignore disconnect errors
        }

        await this.$connect();
        this.logger.log('Successfully connected to database');
        this.connectionRetries = 0; // Reset on success

        // Test the connection with a simple query
        await this.$queryRaw`SELECT 1`;
        this.logger.log('Database connection verified with test query');
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
