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

export enum HotspotType {
  INFO = 'info',
  LINK = 'link',
  AUDIO = 'audio',
  VIDEO = 'video',
  IMAGE = 'image',
  EFFECT = 'effect',
}

export class CreateHotspotDto {
  @ApiPropertyOptional({
    description: 'X coordinate position',
    example: 10.5,
  })
  @IsOptional()
  @IsNumber()
  positionX?: number;

  @ApiPropertyOptional({
    description: 'Y coordinate position',
    example: 2.0,
  })
  @IsOptional()
  @IsNumber()
  positionY?: number;

  @ApiPropertyOptional({
    description: 'Z coordinate position',
    example: -5.3,
  })
  @IsOptional()
  @IsNumber()
  positionZ?: number;

  @ApiPropertyOptional({
    description: 'Vertical angle (-90 to 90 degrees)',
    example: 45,
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
    example: 180,
    minimum: 0,
    maximum: 360,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(360)
  yaw?: number;

  @ApiProperty({
    description: 'Type of hotspot',
    enum: HotspotType,
    example: HotspotType.INFO,
  })
  @IsEnum(HotspotType)
  type: string;

  @ApiPropertyOptional({
    description: 'Title of the hotspot',
    example: 'Famous Painting',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Description of the hotspot',
    example: 'Learn about this masterpiece created in 1920',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Icon name or URL',
    example: 'info-circle',
  })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({
    description: 'URL to navigate to (for link type)',
    example: 'https://museum.com/painting-details',
  })
  @IsOptional()
  @IsUrl()
  actionUrl?: string;

  @ApiPropertyOptional({
    description: 'Audio URL to play (for audio type)',
    example: 'https://cloudinary.com/audio/painting-explanation.mp3',
  })
  @IsOptional()
  @IsUrl()
  actionAudioUrl?: string;

  @ApiPropertyOptional({
    description: 'Video URL to play (for video type)',
    example: 'https://cloudinary.com/video/artist-interview.mp4',
  })
  @IsOptional()
  @IsUrl()
  actionVideoUrl?: string;

  @ApiPropertyOptional({
    description: 'Image URL to show (for image type)',
    example: 'https://cloudinary.com/images/painting-closeup.jpg',
  })
  @IsOptional()
  @IsUrl()
  actionImageUrl?: string;

  @ApiPropertyOptional({
    description: 'Effect name to trigger (for effect type)',
    example: 'fade',
  })
  @IsOptional()
  @IsString()
  actionEffect?: string;

  @ApiPropertyOptional({
    description: 'Distance to trigger the hotspot',
    example: 5.0,
    default: 5.0,
  })
  @IsOptional()
  @IsNumber()
  triggerDistance?: number;

  @ApiPropertyOptional({
    description: 'Auto-trigger when in range',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  autoTrigger?: boolean;

  @ApiPropertyOptional({
    description: 'Show hotspot on hover',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  showOnHover?: boolean;

  @ApiPropertyOptional({
    description: 'Color code for the hotspot',
    example: '#3498db',
  })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({
    description: 'Size multiplier',
    example: 1.2,
    default: 1.0,
  })
  @IsOptional()
  @IsNumber()
  size?: number;

  @ApiPropertyOptional({
    description: 'Order for sorting',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  order?: number;
}