import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsUrl, IsNumber, IsBoolean } from 'class-validator';

export enum SimulationType {
  DECISION = 'decision',
  TIMELINE = 'timeline',
  INTERACTIVE = 'interactive',
}

export class CreateSimulationDto {
  @ApiProperty({
    description: 'Title of the simulation',
    example: 'Historical Decision Scenario',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    description: 'Description of the simulation',
    example: 'An interactive scenario based on historical events',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Detailed scenario text',
    example: 'In this scenario, you face choices during a key historical moment...',
  })
  @IsOptional()
  @IsString()
  scenario?: string;

  @ApiProperty({
    description: 'Type of simulation',
    enum: SimulationType,
    example: SimulationType.DECISION,
  })
  @IsEnum(SimulationType)
  @IsNotEmpty()
  simulationType: SimulationType;

  @ApiPropertyOptional({
    description: 'URL for background image',
    example: 'https://example.com/background.jpg',
  })
  @IsOptional()
  @IsUrl()
  backgroundImage?: string;

  @ApiPropertyOptional({
    description: 'ID of associated educational content',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  educationId?: number;

  @ApiPropertyOptional({
    description: 'Status of the simulation',
    example: 'draft',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Whether the simulation is published',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
