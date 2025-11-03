import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';

export class LinkTestimonyEventDto {
  @ApiProperty({
    description: 'Event ID to link',
    example: 1,
  })
  @IsInt({ message: 'Event ID must be an integer' })
  @IsNotEmpty({ message: 'Event ID is required' })
  @Min(1, { message: 'Event ID must be at least 1' })
  eventId: number;

  @ApiProperty({
    description: 'Optional notes about the link',
    example: 'Primary event mentioned in this testimony',
    required: false,
  })
  @IsOptional()
  notes?: string;

  @ApiProperty({
    description: 'Confidence score (0.0 to 1.0)',
    example: 0.95,
    required: false,
  })
  @IsNumber({}, { message: 'Confidence must be a number' })
  @Min(0, { message: 'Confidence must be between 0 and 1' })
  @IsOptional()
  confidence?: number;
}
