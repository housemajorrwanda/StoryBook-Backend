import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Successfully connected to database');
    } catch (error) {
      this.logger.error(
        'Failed to connect to database:',
        error instanceof Error ? error.message : 'Unknown error',
      );
      this.logger.warn(
        'Continuing startup - database connection will be retried on first query',
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
