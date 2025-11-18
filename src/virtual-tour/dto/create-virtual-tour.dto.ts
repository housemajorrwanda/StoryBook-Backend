
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  Max,
  IsUrl,
  ArrayNotEmpty,
  ValidateIf,
  IsObject,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum TourType {
  EMBED = 'embed',
  IMAGE_360 = '360_image',
  VIDEO_360 = '360_video',
  MODEL_3D = '3d_model',
}

export enum HotspotType {
  INFO = 'info',
  LINK = 'link',
  AUDIO = 'audio',
  VIDEO = 'video',
  IMAGE = 'image',
  EFFECT = 'effect',
}

export enum RegionType {
  SPHERE = 'sphere',
  BOX = 'box',
}

export enum EffectType {
  VISUAL = 'visual',
  SOUND = 'sound',
  PARTICLE = 'particle',
  ANIMATION = 'animation',
}

export enum TriggerType {
  ON_ENTER = 'on_enter',
  ON_LOOK = 'on_look',
  ON_CLICK = 'on_click',
  ON_TIMER = 'on_timer',
  ALWAYS = 'always',
}

export class PositionDto {
  @ApiPropertyOptional({ description: 'X coordinate position' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  positionX?: number;

  @ApiPropertyOptional({ description: 'Y coordinate position' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  positionY?: number;

  @ApiPropertyOptional({ description: 'Z coordinate position' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  positionZ?: number;

  @ApiPropertyOptional({ description: 'Vertical angle (pitch) in degrees' })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  pitch?: number;

  @ApiPropertyOptional({ description: 'Horizontal angle (yaw) in degrees' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(360)
  @Type(() => Number)
  yaw?: number;
}

export class VirtualTourHotspotDto extends PositionDto {
  @ApiProperty({
    description: 'Hotspot type',
    enum: HotspotType,
  })
  @IsEnum(HotspotType)
  @IsNotEmpty()
  type: HotspotType;

  @ApiPropertyOptional({ description: 'Hotspot title' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @ApiPropertyOptional({ description: 'Hotspot description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Icon name or URL' })
  @IsOptional()
  @IsString()
  @IsUrl()
  icon?: string;

  @ApiPropertyOptional({ description: 'Action URL (for link type)' })
  @ValidateIf((o) => o.type === HotspotType.LINK)
  @IsUrl()
  actionUrl?: string;

  @ApiPropertyOptional({ description: 'Action audio URL (for audio type)' })
  @ValidateIf((o) => o.type === HotspotType.AUDIO)
  @IsUrl()
  actionAudioUrl?: string;

  @ApiPropertyOptional({ description: 'Action video URL (for video type)' })
  @ValidateIf((o) => o.type === HotspotType.VIDEO)
  @IsUrl()
  actionVideoUrl?: string;

  @ApiPropertyOptional({ description: 'Action image URL (for image type)' })
  @ValidateIf((o) => o.type === HotspotType.IMAGE)
  @IsUrl()
  actionImageUrl?: string;

  @ApiPropertyOptional({ description: 'Effect name (for effect type)' })
  @ValidateIf((o) => o.type === HotspotType.EFFECT)
  @IsString()
  actionEffect?: string;

  @ApiPropertyOptional({
    description: 'Trigger distance in meters',
    default: 5.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
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
  color?: string;

  @ApiPropertyOptional({
    description: 'Size multiplier',
    default: 1.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Type(() => Number)
  size?: number;

  @ApiPropertyOptional({ description: 'Display order', default: 0 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  order?: number;
}

export class VirtualTourAudioRegionDto {
  @ApiProperty({
    description: 'Region type',
    enum: RegionType,
    default: RegionType.SPHERE,
  })
  @IsEnum(RegionType)
  @IsNotEmpty()
  regionType: RegionType;

  @ApiProperty({ description: 'Center X coordinate' })
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  centerX: number;

  @ApiProperty({ description: 'Center Y coordinate' })
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  centerY: number;

  @ApiProperty({ description: 'Center Z coordinate' })
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  centerZ: number;

  @ApiPropertyOptional({ description: 'Radius (for sphere regions)' })
  @ValidateIf((o) => o.regionType === RegionType.SPHERE)
  @IsNumber()
  @Min(0.1)
  @Type(() => Number)
  radius?: number;

  @ApiPropertyOptional({ description: 'Width (for box regions)' })
  @ValidateIf((o) => o.regionType === RegionType.BOX)
  @IsNumber()
  @Min(0.1)
  @Type(() => Number)
  width?: number;

  @ApiPropertyOptional({ description: 'Height (for box regions)' })
  @ValidateIf((o) => o.regionType === RegionType.BOX)
  @IsNumber()
  @Min(0.1)
  @Type(() => Number)
  height?: number;

  @ApiPropertyOptional({ description: 'Depth (for box regions)' })
  @ValidateIf((o) => o.regionType === RegionType.BOX)
  @IsNumber()
  @Min(0.1)
  @Type(() => Number)
  depth?: number;

  @ApiProperty({ description: 'Audio file URL' })
  @IsUrl()
  @IsNotEmpty()
  audioUrl: string;

  @ApiProperty({ description: 'Audio file name' })
  @IsString()
  @IsNotEmpty()
  audioFileName: string;

  @ApiPropertyOptional({
    description: 'Volume (0.0 to 1.0)',
    default: 1.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  @Type(() => Number)
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
  @Type(() => Number)
  fadeInDuration?: number;

  @ApiPropertyOptional({
    description: 'Fade out duration in seconds',
    default: 2.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
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
  @Type(() => Number)
  minDistance?: number;

  @ApiPropertyOptional({
    description: 'Maximum distance to hear audio',
    default: 10.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
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
  title?: string;

  @ApiPropertyOptional({ description: 'Region description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Display order', default: 0 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  order?: number;
}

export class VirtualTourEffectDto extends PositionDto {
  @ApiProperty({
    description: 'Effect type',
    enum: EffectType,
  })
  @IsEnum(EffectType)
  @IsNotEmpty()
  effectType: EffectType;

  @ApiProperty({
    description: 'Trigger type',
    enum: TriggerType,
  })
  @IsEnum(TriggerType)
  @IsNotEmpty()
  triggerType: TriggerType;

  @ApiPropertyOptional({ description: 'Distance to trigger' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  triggerDistance?: number;

  @ApiPropertyOptional({
    description: 'Delay before triggering in seconds',
    default: 0.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  triggerDelay?: number;

  @ApiProperty({
    description: 'Effect name (e.g., "fog", "rain", "light_flash")',
  })
  @IsString()
  @IsNotEmpty()
  effectName: string;

  @ApiPropertyOptional({
    description: 'Effect intensity (0.0 to 1.0)',
    default: 1.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  @Type(() => Number)
  intensity?: number;

  @ApiPropertyOptional({
    description: 'Effect duration in seconds (null = infinite)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  duration?: number;

  @ApiPropertyOptional({ description: 'Color for visual effects' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'Sound file URL for sound effects' })
  @ValidateIf((o) => o.effectType === EffectType.SOUND)
  @IsUrl()
  soundUrl?: string;

  @ApiPropertyOptional({
    description: 'Number of particles (for particle effects)',
  })
  @ValidateIf((o) => o.effectType === EffectType.PARTICLE)
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  particleCount?: number;

  @ApiPropertyOptional({
    description: 'Opacity (0.0 to 1.0)',
    default: 1.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  @Type(() => Number)
  opacity?: number;

  @ApiPropertyOptional({
    description: 'Size multiplier',
    default: 1.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Type(() => Number)
  size?: number;

  @ApiPropertyOptional({
    description: 'Animation type',
    enum: ['fade', 'slide', 'rotate', 'pulse', 'shake'],
  })
  @ValidateIf((o) => o.effectType === EffectType.ANIMATION)
  @IsString()
  animationType?: string;

  @ApiPropertyOptional({
    description: 'Animation speed multiplier',
    default: 1.0,
  })
  @ValidateIf((o) => o.effectType === EffectType.ANIMATION)
  @IsNumber()
  @Min(0.1)
  @Type(() => Number)
  animationSpeed?: number;

  @ApiPropertyOptional({ description: 'Effect title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Effect description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Display order', default: 0 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  order?: number;
}

export class CreateVirtualTourDto {
  @ApiProperty({ description: 'Tour title' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ description: 'Tour description' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiProperty({ description: 'Tour location' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(300)
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
  })
  @ValidateIf((o) => o.tourType === TourType.EMBED)
  @IsUrl()
  embedUrl?: string;

  @ApiPropertyOptional({
    description: '360° image URL (for 360_image type)',
  })
  @ValidateIf((o) => o.tourType === TourType.IMAGE_360)
  @IsUrl()
  image360Url?: string;

  @ApiPropertyOptional({
    description: '360° video URL (for 360_video type)',
  })
  @ValidateIf((o) => o.tourType === TourType.VIDEO_360)
  @IsUrl()
  video360Url?: string;

  @ApiPropertyOptional({
    description: '3D model URL (for 3d_model type)',
  })
  @ValidateIf((o) => o.tourType === TourType.MODEL_3D)
  @IsUrl()
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
