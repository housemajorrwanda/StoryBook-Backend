import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  Max,
  IsUrl,
} from 'class-validator';

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

export enum AnimationType {
  FADE = 'fade',
  SLIDE = 'slide',
  ROTATE = 'rotate',
  PULSE = 'pulse',
  SHAKE = 'shake',
}

export class CreateEffectDto {
  @ApiProperty({
    description: 'Type of effect',
    enum: EffectType,
    example: EffectType.VISUAL,
  })
  @IsEnum(EffectType)
  effectType: string;

  @ApiPropertyOptional({
    description: 'X coordinate position',
    example: 20.0,
  })
  @IsOptional()
  @IsNumber()
  positionX?: number;

  @ApiPropertyOptional({
    description: 'Y coordinate position',
    example: 3.0,
  })
  @IsOptional()
  @IsNumber()
  positionY?: number;

  @ApiPropertyOptional({
    description: 'Z coordinate position',
    example: -12.0,
  })
  @IsOptional()
  @IsNumber()
  positionZ?: number;

  @ApiPropertyOptional({
    description: 'Vertical angle (-90 to 90 degrees)',
    example: 30,
    minimum: -90,
    maximum: 90,
  })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  pitch?: number;

  @ApiPropertyOptional({
    description: 'Horizontal angle (0 to 360 degrees)',
    example: 270,
    minimum: 0,
    maximum: 360,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(360)
  yaw?: number;

  @ApiProperty({
    description: 'Trigger condition for the effect',
    enum: TriggerType,
    example: TriggerType.ON_ENTER,
  })
  @IsEnum(TriggerType)
  triggerType: string;

  @ApiPropertyOptional({
    description: 'Distance to trigger the effect',
    example: 4.0,
  })
  @IsOptional()
  @IsNumber()
  triggerDistance?: number;

  @ApiPropertyOptional({
    description: 'Delay before triggering in seconds',
    example: 0.0,
    default: 0.0,
  })
  @IsOptional()
  @IsNumber()
  triggerDelay?: number;

  @ApiProperty({
    description: 'Name of the effect',
    example: 'spotlight',
  })
  @IsString()
  effectName: string;

  @ApiPropertyOptional({
    description: 'Effect intensity (0.0 to 1.0)',
    example: 0.9,
    default: 1.0,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  intensity?: number;

  @ApiPropertyOptional({
    description: 'Effect duration in seconds (null = infinite)',
    example: 30.0,
  })
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiPropertyOptional({
    description: 'Color for visual effects',
    example: '#ffff00',
  })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({
    description: 'Sound URL for sound effects',
    example: 'https://cloudinary.com/audio/magic-sound.mp3',
  })
  @IsOptional()
  @IsUrl()
  soundUrl?: string;

  @ApiPropertyOptional({
    description: 'Number of particles for particle effects',
    example: 100,
  })
  @IsOptional()
  @IsNumber()
  particleCount?: number;

  @ApiPropertyOptional({
    description: 'Opacity level (0.0 to 1.0)',
    example: 0.8,
    default: 1.0,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  opacity?: number;

  @ApiPropertyOptional({
    description: 'Size multiplier',
    example: 1.5,
    default: 1.0,
  })
  @IsOptional()
  @IsNumber()
  size?: number;

  @ApiPropertyOptional({
    description: 'Type of animation',
    enum: AnimationType,
    example: AnimationType.FADE,
  })
  @IsOptional()
  @IsEnum(AnimationType)
  animationType?: string;

  @ApiPropertyOptional({
    description: 'Animation speed multiplier',
    example: 1.0,
    default: 1.0,
  })
  @IsOptional()
  @IsNumber()
  animationSpeed?: number;

  @ApiPropertyOptional({
    description: 'Title of the effect',
    example: 'Main Exhibit Spotlight',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Description of the effect',
    example: 'Spotlight effect highlighting the main exhibition piece',
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
