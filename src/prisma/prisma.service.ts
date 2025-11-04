import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);
  // NOTE: Do NOT manually add model properties here (e.g., virtualTour, testimony, etc.)
  // Prisma Client automatically generates all model accessors when you run 'prisma generate'
  // Adding them manually causes TypeScript errors because they conflict with the generated accessors

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Successfully connected to database');
    } catch (error) {
      this.logger.error(
        'Failed to connect to database:',
        error instanceof Error ? error.message : 'Unknown error',
      );
      // Don't crash the app - allow health check to still work
      // The app will retry connection on subsequent queries
      this.logger.warn(
        'Continuing startup - database connection will be retried on first query',
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
