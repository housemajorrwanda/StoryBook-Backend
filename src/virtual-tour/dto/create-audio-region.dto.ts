import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsEnum,
  Min,
  Max,
  IsUrl,
} from 'class-validator';

export enum RegionType {
  SPHERE = 'sphere',
  BOX = 'box',
}

export class CreateAudioRegionDto {
  @ApiProperty({
    description: 'Type of audio region',
    enum: RegionType,
    example: RegionType.SPHERE,
    default: RegionType.SPHERE,
  })
  @IsEnum(RegionType)
  regionType: string;

  @ApiProperty({
    description: 'X coordinate of center point',
    example: 15.0,
  })
  @IsNumber()
  centerX: number;

  @ApiProperty({
    description: 'Y coordinate of center point',
    example: 1.8,
  })
  @IsNumber()
  centerY: number;

  @ApiProperty({
    description: 'Z coordinate of center point',
    example: -8.0,
  })
  @IsNumber()
  centerZ: number;

  @ApiPropertyOptional({
    description: 'Radius for sphere regions',
    example: 5.0,
  })
  @IsOptional()
  @IsNumber()
  radius?: number;

  @ApiPropertyOptional({
    description: 'Width for box regions',
    example: 10.0,
  })
  @IsOptional()
  @IsNumber()
  width?: number;

  @ApiPropertyOptional({
    description: 'Height for box regions',
    example: 4.0,
  })
  @IsOptional()
  @IsNumber()
  height?: number;

  @ApiPropertyOptional({
    description: 'Depth for box regions',
    example: 8.0,
  })
  @IsOptional()
  @IsNumber()
  depth?: number;

  @ApiProperty({
    description: 'Audio file URL',
    example: 'https://cloudinary.com/audio/ambient-gallery.mp3',
  })
  @IsUrl()
  audioUrl: string;

  @ApiProperty({
    description: 'Audio file name',
    example: 'ambient-gallery-sound.mp3',
  })
  @IsString()
  audioFileName: string;

  @ApiPropertyOptional({
    description: 'Volume level (0.0 to 1.0)',
    example: 0.8,
    default: 1.0,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  volume?: number;

  @ApiPropertyOptional({
    description: 'Whether to loop the audio',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  loop?: boolean;

  @ApiPropertyOptional({
    description: 'Fade in duration in seconds',
    example: 2.0,
    default: 2.0,
  })
  @IsOptional()
  @IsNumber()
  fadeInDuration?: number;

  @ApiPropertyOptional({
    description: 'Fade out duration in seconds',
    example: 2.0,
    default: 2.0,
  })
  @IsOptional()
  @IsNumber()
  fadeOutDuration?: number;

  @ApiPropertyOptional({
    description: 'Enable 3D positional audio',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  spatialAudio?: boolean;

  @ApiPropertyOptional({
    description: 'Minimum distance for full volume',
    example: 1.0,
    default: 1.0,
  })
  @IsOptional()
  @IsNumber()
  minDistance?: number;

  @ApiPropertyOptional({
    description: 'Maximum distance to hear audio',
    example: 15.0,
    default: 10.0,
  })
  @IsOptional()
  @IsNumber()
  maxDistance?: number;

  @ApiPropertyOptional({
    description: 'Auto-play when entering region',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  autoPlay?: boolean;

  @ApiPropertyOptional({
    description: 'Play only once per visit',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  playOnce?: boolean;

  @ApiPropertyOptional({
    description: 'Title of the audio region',
    example: 'Ambient Gallery Sound',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Description of the audio region',
    example: 'Background ambient sound for the main gallery',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Order for sorting',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  order?: number;
}
