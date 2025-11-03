import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';

export class LinkTestimonyLocationDto {
  @ApiProperty({
    description: 'Location ID to link',
    example: 1,
  })
  @IsInt({ message: 'Location ID must be an integer' })
  @IsNotEmpty({ message: 'Location ID is required' })
  @Min(1, { message: 'Location ID must be at least 1' })
  locationId: number;

  @ApiProperty({
    description: 'Optional notes about the link',
    example: 'Where the event took place',
    required: false,
  })
  @IsOptional()
  notes?: string;

  @ApiProperty({
    description: 'Confidence score (0.0 to 1.0)',
    example: 0.85,
    required: false,
  })
  @IsNumber({}, { message: 'Confidence must be a number' })
  @Min(0, { message: 'Confidence must be between 0 and 1' })
  @IsOptional()
  confidence?: number;
}
