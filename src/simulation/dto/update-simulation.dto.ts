import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsUrl, IsNumber, IsBoolean } from 'class-validator';
import { SimulationType } from './create-simulation.dto';


export class UpdateSimulationDto {
  @ApiPropertyOptional({
    description: 'Title of the simulation',
    example: 'Updated Historical Decision Scenario',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Description of the simulation',
    example: 'Updated interactive scenario',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Detailed scenario text',
    example: 'Updated scenario details...',
  })
  @IsOptional()
  @IsString()
  scenario?: string;

  @ApiPropertyOptional({
    description: 'Type of simulation',
    enum: SimulationType,
    example: SimulationType.TIMELINE,
  })
  @IsOptional()
  @IsEnum(SimulationType)
  simulationType?: SimulationType;

  @ApiPropertyOptional({
    description: 'URL for background image',
    example: 'https://example.com/new-background.jpg',
  })
  @IsOptional()
  @IsUrl()
  backgroundImage?: string;

  @ApiPropertyOptional({
    description: 'ID of associated educational content',
    example: 2,
  })
  @IsOptional()
  @IsNumber()
  educationId?: number;

  @ApiPropertyOptional({
    description: 'Status of the simulation',
    example: 'published',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Whether the simulation is published',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}