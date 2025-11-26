import { Module } from '@nestjs/common';
import { SimulationService } from './simulation.service';
import { SimulationController } from './simulation.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  controllers: [SimulationController],
  providers: [SimulationService],
  imports: [PrismaModule],
  exports: [SimulationService]
})
export class SimulationModule {}
