import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateTestimonyDto } from './create-testimony.dto';

export class UpdateTestimonyDto extends PartialType(
  OmitType(CreateTestimonyDto, ['submissionType', 'agreedToTerms'] as const),
) {}
