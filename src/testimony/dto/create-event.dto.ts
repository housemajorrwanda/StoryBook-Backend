import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class CreateEventDto {
  @ApiProperty({
    description: 'Title of the event',
    example: 'Rwandan Genocide',
  })
  @IsString({ message: 'Title must be a string' })
  @IsNotEmpty({ message: 'Title is required' })
  @MaxLength(200, { message: 'Title must not exceed 200 characters' })
  title: string;

  @ApiProperty({
    description: 'Optional start date of the event',
    example: '1994-04-07',
    required: false,
  })
  @IsDateString({}, { message: 'Date range start must be a valid date' })
  @IsOptional()
  dateRangeStart?: string;

  @ApiProperty({
    description: 'Optional end date of the event',
    example: '1994-07-15',
    required: false,
  })
  @IsDateString({}, { message: 'Date range end must be a valid date' })
  @IsOptional()
  dateRangeEnd?: string;

  @ApiProperty({
    description: 'Alternative names/aliases for the event',
    example: ['Genocide against the Tutsi', '1994 Genocide'],
    required: false,
  })
  @IsArray({ message: 'Aliases must be an array' })
  @IsString({ each: true, message: 'Each alias must be a string' })
  @IsOptional()
  aliases?: string[];
}
