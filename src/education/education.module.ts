import { Module } from '@nestjs/common';
import { EducationService } from './education.service';
import { EducationController } from './education.controller';
import { UploadModule } from '../upload/upload.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  controllers: [EducationController],
  providers: [EducationService],
  imports: [PrismaModule, UploadModule],
  exports: [EducationService],
})
export class EducationModule {}
