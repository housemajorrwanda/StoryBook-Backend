import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateTestimonyDto } from './create-testimony.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateTestimonyDto extends PartialType(
  OmitType(CreateTestimonyDto, ['submissionType', 'relatives'] as const),
) {
  @ApiPropertyOptional({
    description:
      'Agreement to terms and conditions (required when publishing a draft)',
    example: true,
  })
  @ValidateIf((o: UpdateTestimonyDto) => o.isDraft === false)
  @IsBoolean({ message: 'Agreed to terms must be a boolean' })
  @Transform(({ value }) => value === true || value === 'true')
  agreedToTerms?: boolean;
}
