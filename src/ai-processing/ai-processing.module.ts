import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { EmailModule } from '../email/email.module';
import { EmbeddingProviderService } from './embedding-provider.service';
import { TranscriptionService } from './transcription.service';
import { TestimonyAiService } from './testimony-ai.service';
import { TestimonyConnectionService } from './testimony-connection.service';

@Module({
  imports: [PrismaModule, NotificationModule, EmailModule],
  providers: [
    EmbeddingProviderService,
    TranscriptionService,
    TestimonyAiService,
    TestimonyConnectionService,
  ],
  exports: [TestimonyAiService, TestimonyConnectionService, EmbeddingProviderService],
})
export class AiProcessingModule {}
