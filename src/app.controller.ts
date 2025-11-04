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
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        ...health,
        database: 'connected',
      };
    } catch (error) {
      return {
        ...health,
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
