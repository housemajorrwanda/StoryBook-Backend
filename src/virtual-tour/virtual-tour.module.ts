import { Module } from '@nestjs/common';
import { VirtualTourController } from './virtual-tour.controller';
import { VirtualTourService } from './virtual-tour.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadModule } from '../upload/upload.module';
import { HotspotController } from './hotspot.controller';
import { AudioRegionController } from './audio-region.controller';
import { EffectController } from './effect.controller';

@Module({
  imports: [PrismaModule, UploadModule],
  controllers: [
    VirtualTourController,
    HotspotController,
    AudioRegionController,
    EffectController,
  ],
  providers: [VirtualTourService],
  exports: [VirtualTourService],
})
export class VirtualTourModule {}
