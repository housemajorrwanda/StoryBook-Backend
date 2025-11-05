import { Module } from '@nestjs/common';
import { VirtualTourController } from './virtual-tour.controller';
import { VirtualTourService } from './virtual-tour.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [PrismaModule, UploadModule],
  controllers: [VirtualTourController],
  providers: [VirtualTourService],
  exports: [VirtualTourService],
})
export class VirtualTourModule {}
