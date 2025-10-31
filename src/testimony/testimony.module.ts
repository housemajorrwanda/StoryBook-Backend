import { Module } from '@nestjs/common';
import { TestimonyService } from './testimony.service';
import { TestimonyController } from './testimony.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [PrismaModule, UploadModule],
  controllers: [TestimonyController],
  providers: [TestimonyService],
  exports: [TestimonyService],
})
export class TestimonyModule {}
