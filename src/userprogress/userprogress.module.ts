import { Module } from '@nestjs/common';
import { UserProgressService } from './userprogress.service';
import { UserProgressController } from './userprogress.controller';
import { UploadModule } from '../upload/upload.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  controllers: [UserProgressController],
  providers: [UserProgressService],
  imports: [PrismaModule, UploadModule],
  exports: [UserProgressService],
})
export class UserprogressModule {}
