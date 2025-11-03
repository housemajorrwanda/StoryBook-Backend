import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  MaxLength,
  Min,
  Max,
} from 'class-validator';

export class CreateLocationDto {
  @ApiProperty({
    description: 'Name of the location',
    example: 'Kigali',
  })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(200, { message: 'Name must not exceed 200 characters' })
  name: string;

  @ApiProperty({
    description:
      'Normalized name for search (optional, auto-generated if not provided)',
    example: 'kigali',
    required: false,
  })
  @IsString({ message: 'Normalized name must be a string' })
  @IsOptional()
  normalizedName?: string;

  @ApiProperty({
    description: 'Latitude',
    example: -1.9441,
    required: false,
  })
  @IsNumber({}, { message: 'Latitude must be a number' })
  @Min(-90, { message: 'Latitude must be between -90 and 90' })
  @Max(90, { message: 'Latitude must be between -90 and 90' })
  @IsOptional()
  lat?: number;

  @ApiProperty({
    description: 'Longitude',
    example: 30.0619,
    required: false,
  })
  @IsNumber({}, { message: 'Longitude must be a number' })
  @Min(-180, { message: 'Longitude must be between -180 and 180' })
  @Max(180, { message: 'Longitude must be between -180 and 180' })
  @IsOptional()
  lng?: number;
}
