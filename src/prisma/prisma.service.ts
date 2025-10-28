import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      const dbUrl = process.env.DATABASE_URL;
      if (dbUrl) {
        const urlParts = dbUrl.split('@');
        const maskedUrl =
          urlParts.length > 1
            ? `postgresql://***:***@${urlParts[1]}`
            : 'postgresql://***:***@***';
        this.logger.log(`Connecting to database: ${maskedUrl}`);
      } else {
        this.logger.error('DATABASE_URL environment variable is not set');
        throw new Error('DATABASE_URL environment variable is required');
      }

      await this.$connect();
      this.logger.log('Successfully connected to database');

      // Test database connection with a simple query
      await this.$queryRaw`SELECT 1`;
      this.logger.log('Database connection test successful');
    } catch (error: unknown) {
      let errorInfo: {
        message: string;
        code?: unknown;
        stack?: unknown;
        databaseUrl: string;
      };
      if (error instanceof Error) {
        errorInfo = {
          message: error.message,
          code: (error as { code?: unknown }).code,
          stack: error.stack,
          databaseUrl: process.env.DATABASE_URL ? 'Set' : 'Not set',
        };
        errorInfo = {
          message: JSON.stringify(error),
          code: (error as { code?: unknown }).code,
          stack: (error as { stack?: unknown }).stack,
          databaseUrl: process.env.DATABASE_URL ? 'Set' : 'Not set',
        };
      } else {
        errorInfo = {
          message: String(error),
          code: undefined,
          stack: undefined,
          databaseUrl: process.env.DATABASE_URL ? 'Set' : 'Not set',
        };
      }
      this.logger.error('Failed to connect to database:', errorInfo);

      if (process.env.NODE_ENV !== 'production') {
        this.logger.warn(
          'Continuing without database connection in development mode',
        );
      } else {
        this.logger.error(
          'Database connection failed in production. Application will not start.',
        );
        throw error;
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
