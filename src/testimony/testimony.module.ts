import { Module } from '@nestjs/common';
import { TestimonyService } from './testimony.service';
import { TestimonyController } from './testimony.controller';
import { DraftReminderService } from './draft-reminder.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { NotificationModule } from '../notification/notification.module';
import { UploadModule } from '../upload/upload.module';
import { AiProcessingModule } from '../ai-processing/ai-processing.module';

@Module({
  imports: [
    PrismaModule,
    UploadModule,
    EmailModule,
    NotificationModule,
    AiProcessingModule,
  ],
  controllers: [TestimonyController],
  providers: [TestimonyService, DraftReminderService],
  exports: [TestimonyService],
})
export class TestimonyModule {}
