import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('ping')
  getPing() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('health')
  async getHealth() {
    const health: {
      status: string;
      timestamp: string;
      uptime: number;
      database?: string;
      databaseError?: string;
    } = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };

    // Check database connection with timeout (non-blocking for healthcheck)
    try {
      // Use Promise.race to add timeout to database check
      const dbCheck = this.prisma.$queryRaw`SELECT 1`;
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Database check timeout')), 2000),
      );

      await Promise.race([dbCheck, timeout]);
      health.database = 'connected';
    } catch (error) {
      // Database check failed or timed out - log but don't fail healthcheck
      health.database = 'disconnected';
      if (error instanceof Error) {
        health.databaseError = error.message;
      }
    }

    // Always return 200 OK - Railway just needs to know the HTTP service is responding
    // Database connection issues are handled gracefully by the application
    return health;
  }
}
