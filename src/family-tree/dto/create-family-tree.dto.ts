import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsPositive,
  IsIn,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateFamilyTreeDto {
  @ApiProperty({ example: 'Mukamana Family Tree' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title: string;

  @ApiPropertyOptional({ example: 'Our family history spanning 4 generations.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class UpdateFamilyTreeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class CreateFamilyMemberDto {
  @ApiProperty({ example: 'Jean-Paul Habimana' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiPropertyOptional({ example: '1952' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  birthDate?: string;

  @ApiPropertyOptional({ example: '2010' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  deathDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @ApiPropertyOptional({ enum: ['male', 'female', 'other', 'unknown'] })
  @IsOptional()
  @IsIn(['male', 'female', 'other', 'unknown'])
  gender?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isAlive?: boolean;

  @ApiPropertyOptional({ description: 'Link to a testimony by ID' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  testimonyId?: number;
}

export class UpdateFamilyMemberDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  birthDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  deathDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(['male', 'female', 'other', 'unknown'])
  gender?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isAlive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @IsPositive()
  testimonyId?: number | null;
}

export class CreateFamilyRelationDto {
  @ApiProperty({ description: 'ID of the "from" member' })
  @IsInt()
  @IsPositive()
  fromMemberId: number;

  @ApiProperty({ description: 'ID of the "to" member' })
  @IsInt()
  @IsPositive()
  toMemberId: number;

  @ApiProperty({ enum: ['parent', 'spouse', 'sibling', 'child'] })
  @IsIn(['parent', 'spouse', 'sibling', 'child'])
  relationType: string;
}
