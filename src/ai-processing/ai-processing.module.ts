import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EmbeddingProviderService } from './embedding-provider.service';
import { TranscriptionService } from './transcription.service';
import { TestimonyAiService } from './testimony-ai.service';
import { TestimonyConnectionService } from './testimony-connection.service';

@Module({
  imports: [PrismaModule],
  providers: [
    EmbeddingProviderService,
    TranscriptionService,
    TestimonyAiService,
    TestimonyConnectionService,
  ],
  exports: [TestimonyAiService, TestimonyConnectionService],
})
export class AiProcessingModule {}
