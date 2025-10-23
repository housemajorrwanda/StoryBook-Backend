import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateTestimonyDto } from './create-testimony.dto';

// Omit submissionType from updates (can't change submission type after creation)
export class UpdateTestimonyDto extends PartialType(
  OmitType(CreateTestimonyDto, ['submissionType', 'agreedToTerms'] as const)
) {}
