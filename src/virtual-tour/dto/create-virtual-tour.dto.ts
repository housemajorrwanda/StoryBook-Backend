import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  MaxLength,
  MinLength,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum TourType {
  EMBED = 'embed',
  IMAGE_360 = '360_image',
  VIDEO_360 = '360_video',
  MODEL_3D = '3d_model',
}

export class VirtualTourHotspotDto {
  @ApiPropertyOptional({ description: 'X coordinate position' })
  @IsOptional()
  @IsNumber()
  positionX?: number;

  @ApiPropertyOptional({ description: 'Y coordinate position' })
  @IsOptional()
  @IsNumber()
  positionY?: number;

  @ApiPropertyOptional({ description: 'Z coordinate position' })
  @IsOptional()
  @IsNumber()
  positionZ?: number;

  @ApiPropertyOptional({ description: 'Vertical angle (pitch) in degrees' })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  pitch?: number;

  @ApiPropertyOptional({ description: 'Horizontal angle (yaw) in degrees' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(360)
  yaw?: number;

  @ApiProperty({
    description: 'Hotspot type',
    enum: ['info', 'link', 'audio', 'video', 'image', 'effect'],
  })
  @IsEnum(['info', 'link', 'audio', 'video', 'image', 'effect'])
  @IsNotEmpty()
  type: string;

  @ApiPropertyOptional({ description: 'Hotspot title' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ description: 'Hotspot description' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ description: 'Icon name or URL' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  icon?: string;

  @ApiPropertyOptional({ description: 'Action URL (for link type)' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  actionUrl?: string;

  @ApiPropertyOptional({ description: 'Action audio URL (for audio type)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  actionAudioUrl?: string;

  @ApiPropertyOptional({ description: 'Action video URL (for video type)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  actionVideoUrl?: string;

  @ApiPropertyOptional({ description: 'Action image URL (for image type)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  actionImageUrl?: string;

  @ApiPropertyOptional({ description: 'Effect name (for effect type)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  actionEffect?: string;

  @ApiPropertyOptional({
    description: 'Trigger distance in meters',
    default: 5.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  triggerDistance?: number;

  @ApiPropertyOptional({
    description: 'Auto-trigger when in range',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  autoTrigger?: boolean;

  @ApiPropertyOptional({
    description: 'Show on hover',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  showOnHover?: boolean;

  @ApiPropertyOptional({ description: 'Color code' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @ApiPropertyOptional({
    description: 'Size multiplier',
    default: 1.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  size?: number;

  @ApiPropertyOptional({ description: 'Display order', default: 0 })
  @IsOptional()
  @IsNumber()
  order?: number;
}

export class VirtualTourAudioRegionDto {
  @ApiProperty({
    description: 'Region type',
    enum: ['sphere', 'box'],
    default: 'sphere',
  })
  @IsEnum(['sphere', 'box'])
  @IsNotEmpty()
  regionType: string;

  @ApiProperty({ description: 'Center X coordinate' })
  @IsNumber()
  @IsNotEmpty()
  centerX: number;

  @ApiProperty({ description: 'Center Y coordinate' })
  @IsNumber()
  @IsNotEmpty()
  centerY: number;

  @ApiProperty({ description: 'Center Z coordinate' })
  @IsNumber()
  @IsNotEmpty()
  centerZ: number;

  @ApiPropertyOptional({ description: 'Radius (for sphere regions)' })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  radius?: number;

  @ApiPropertyOptional({ description: 'Width (for box regions)' })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  width?: number;

  @ApiPropertyOptional({ description: 'Height (for box regions)' })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  height?: number;

  @ApiPropertyOptional({ description: 'Depth (for box regions)' })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  depth?: number;

  @ApiProperty({ description: 'Audio file URL' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  audioUrl: string;

  @ApiProperty({ description: 'Audio file name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  audioFileName: string;

  @ApiPropertyOptional({
    description: 'Volume (0.0 to 1.0)',
    default: 1.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  volume?: number;

  @ApiPropertyOptional({ description: 'Loop audio', default: true })
  @IsOptional()
  @IsBoolean()
  loop?: boolean;

  @ApiPropertyOptional({
    description: 'Fade in duration in seconds',
    default: 2.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fadeInDuration?: number;

  @ApiPropertyOptional({
    description: 'Fade out duration in seconds',
    default: 2.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fadeOutDuration?: number;

  @ApiPropertyOptional({
    description: 'Enable spatial audio (3D positional)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  spatialAudio?: boolean;

  @ApiPropertyOptional({
    description: 'Minimum distance for full volume',
    default: 1.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minDistance?: number;

  @ApiPropertyOptional({
    description: 'Maximum distance to hear audio',
    default: 10.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDistance?: number;

  @ApiPropertyOptional({
    description: 'Auto-play when entering region',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  autoPlay?: boolean;

  @ApiPropertyOptional({
    description: 'Play only once per visit',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  playOnce?: boolean;

  @ApiPropertyOptional({ description: 'Region title' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ description: 'Region description' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ description: 'Display order', default: 0 })
  @IsOptional()
  @IsNumber()
  order?: number;
}

export class VirtualTourEffectDto {
  @ApiProperty({
    description: 'Effect type',
    enum: ['visual', 'sound', 'particle', 'animation'],
  })
  @IsEnum(['visual', 'sound', 'particle', 'animation'])
  @IsNotEmpty()
  effectType: string;

  @ApiPropertyOptional({ description: 'X coordinate position' })
  @IsOptional()
  @IsNumber()
  positionX?: number;

  @ApiPropertyOptional({ description: 'Y coordinate position' })
  @IsOptional()
  @IsNumber()
  positionY?: number;

  @ApiPropertyOptional({ description: 'Z coordinate position' })
  @IsOptional()
  @IsNumber()
  positionZ?: number;

  @ApiPropertyOptional({ description: 'Vertical angle (pitch)' })
  @IsOptional()
  @IsNumber()
  pitch?: number;

  @ApiPropertyOptional({ description: 'Horizontal angle (yaw)' })
  @IsOptional()
  @IsNumber()
  yaw?: number;

  @ApiProperty({
    description: 'Trigger type',
    enum: ['on_enter', 'on_look', 'on_click', 'on_timer', 'always'],
  })
  @IsEnum(['on_enter', 'on_look', 'on_click', 'on_timer', 'always'])
  @IsNotEmpty()
  triggerType: string;

  @ApiPropertyOptional({ description: 'Distance to trigger' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  triggerDistance?: number;

  @ApiPropertyOptional({
    description: 'Delay before triggering in seconds',
    default: 0.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  triggerDelay?: number;

  @ApiProperty({
    description: 'Effect name (e.g., "fog", "rain", "light_flash")',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  effectName: string;

  @ApiPropertyOptional({
    description: 'Effect intensity (0.0 to 1.0)',
    default: 1.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  intensity?: number;

  @ApiPropertyOptional({
    description: 'Effect duration in seconds (null = infinite)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;

  @ApiPropertyOptional({ description: 'Color for visual effects' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @ApiPropertyOptional({ description: 'Sound file URL for sound effects' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  soundUrl?: string;

  @ApiPropertyOptional({
    description: 'Number of particles (for particle effects)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  particleCount?: number;

  @ApiPropertyOptional({
    description: 'Opacity (0.0 to 1.0)',
    default: 1.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  opacity?: number;

  @ApiPropertyOptional({
    description: 'Size multiplier',
    default: 1.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  size?: number;

  @ApiPropertyOptional({
    description: 'Animation type',
    enum: ['fade', 'slide', 'rotate', 'pulse', 'shake'],
  })
  @IsOptional()
  @IsString()
  animationType?: string;

  @ApiPropertyOptional({
    description: 'Animation speed multiplier',
    default: 1.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  animationSpeed?: number;

  @ApiPropertyOptional({ description: 'Effect title' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ description: 'Effect description' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ description: 'Display order', default: 0 })
  @IsOptional()
  @IsNumber()
  order?: number;
}

export class CreateVirtualTourDto {
  @ApiProperty({ description: 'Tour title' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(200)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
  @Transform(({ value }) => value?.trim())
  title: string;

  @ApiPropertyOptional({ description: 'Tour description' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
  @Transform(({ value }) => value?.trim())
  description?: string;

  @ApiProperty({ description: 'Tour location' })
  @IsString()
  @IsNotEmpty({ message: 'Location is required' })
  @MinLength(2, { message: 'Location must be at least 2 characters' })
  @MaxLength(300)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
  @Transform(({ value }) => value?.trim())
  location: string;

  @ApiProperty({
    description: 'Tour type',
    enum: TourType,
  })
  @IsEnum(TourType)
  @IsNotEmpty()
  tourType: TourType;

  @ApiPropertyOptional({
    description: 'External embed URL (for embed type)',
    example: 'https://my.matterport.com/show/?m=abc123',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
  @Transform(({ value }) => value?.trim())
  embedUrl?: string;

  @ApiPropertyOptional({
    description: '360° image URL (for 360_image type)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  image360Url?: string;

  @ApiPropertyOptional({
    description: '360° video URL (for 360_video type)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  video360Url?: string;

  @ApiPropertyOptional({
    description: '3D model URL (for 3d_model type)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  model3dUrl?: string;

  @ApiPropertyOptional({ description: 'Original file name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fileName?: string;

  @ApiPropertyOptional({
    description: 'Interactive hotspots',
    type: [VirtualTourHotspotDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VirtualTourHotspotDto)
  hotspots?: VirtualTourHotspotDto[];

  @ApiPropertyOptional({
    description: 'Audio regions',
    type: [VirtualTourAudioRegionDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VirtualTourAudioRegionDto)
  audioRegions?: VirtualTourAudioRegionDto[];

  @ApiPropertyOptional({
    description: 'Visual/sound effects',
    type: [VirtualTourEffectDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VirtualTourEffectDto)
  effects?: VirtualTourEffectDto[];

  @ApiPropertyOptional({
    description: 'Tour status',
    enum: ['draft', 'published', 'archived'],
    default: 'draft',
  })
  @IsOptional()
  @IsEnum(['draft', 'published', 'archived'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Is published',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
