import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsUrl,
  MinLength,
  MaxLength,
  ValidateIf,
} from 'class-validator';


export enum TourType {
  EMBED = 'embed',
  IMAGE_360 = '360_image',
  VIDEO_360 = '360_video',
  MODEL_3D = '3d_model',
}

export enum TourStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export class CreateVirtualTourDto {
  @ApiProperty({
    description: 'Title of the virtual tour',
    example: 'Museum of Modern Art Virtual Tour',
    minLength: 3,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({
    description: 'Description of the virtual tour',
    example: 'Explore our extensive collection of modern and contemporary art from around the world',
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiProperty({
    description: 'Location of the virtual tour',
    example: '11 West 53 Street, New York, NY 10019, USA',
    minLength: 2,
    maxLength: 300,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(300)
  location: string;

  @ApiProperty({
    description: 'Type of virtual tour',
    enum: TourType,
    example: TourType.IMAGE_360,
  })
  @IsEnum(TourType)
  @IsNotEmpty()
  tourType: TourType;

  @ApiPropertyOptional({
    description: 'Embed URL for embed type tours',
    example: 'https://my.matterport.com/show/?m=abc123xyz456',
  })
  @ValidateIf((o) => o.tourType === TourType.EMBED)
  @IsUrl()
  embedUrl?: string;

  @ApiPropertyOptional({
    description: '360 image URL for 360 image tours',
    example: 'https://cloudinary.com/demo/image/upload/virtual-tours/museum-360-panorama.jpg',
  })
  @ValidateIf((o) => o.tourType === TourType.IMAGE_360)
  @IsUrl()
  image360Url?: string;

  @ApiPropertyOptional({
    description: '360 video URL for 360 video tours',
    example: 'https://cloudinary.com/demo/video/upload/virtual-tours/museum-360-video.mp4',
  })
  @ValidateIf((o) => o.tourType === TourType.VIDEO_360)
  @IsUrl()
  video360Url?: string;

  @ApiPropertyOptional({
    description: '3D model URL for 3D model tours',
    example: 'https://cloudinary.com/demo/raw/upload/virtual-tours/museum-3d-model.glb',
  })
  @ValidateIf((o) => o.tourType === TourType.MODEL_3D)
  @IsUrl()
  model3dUrl?: string;

  @ApiPropertyOptional({
    description: 'Original file name of the uploaded tour content',
    example: 'museum-360-panorama.jpg',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fileName?: string;

  @ApiPropertyOptional({
    description: 'Status of the virtual tour',
    enum: TourStatus,
    default: TourStatus.DRAFT,
    example: TourStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(TourStatus)
  status?: TourStatus;

  @ApiPropertyOptional({
    description: 'Whether the tour is published and publicly accessible',
    default: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}