import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  MaxLength,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class UpdateUserProgressDto {
  @ApiPropertyOptional({
    description: 'Progress percentage (0.0 to 1.0)',
    example: 0.85,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  progress?: number;

  @ApiPropertyOptional({
    description: 'Whether the content is completed',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;

  @ApiPropertyOptional({
    description: 'User rating (1-5 stars)',
    example: 4,
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({
    description: 'User feedback text',
    example: 'Very educational and moving.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  feedback?: string;
}
