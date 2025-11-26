import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentType, ContentStatus, ContentCategory } from './create-education.dto';

export class EducationResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the educational content',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Title of the educational content',
    example: 'Understanding the Rwandan Genocide: Historical Context',
  })
  title: string;

  @ApiPropertyOptional({
    description: 'Description of the educational content',
    example: 'A comprehensive overview of the historical events...',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Main content of the educational material',
    example: '<p>This educational content provides detailed analysis...</p>',
  })
  content?: string;

  @ApiProperty({
    description: 'Type of educational content',
    enum: ContentType,
    example: ContentType.ARTICLE,
  })
  type: ContentType;

  @ApiPropertyOptional({
    description: 'Image URL for the educational content',
    example: 'https://cloudinary.com/demo/image/upload/education/genocide-history-cover.jpg',
  })
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'Video URL for video content',
    example: 'https://cloudinary.com/demo/video/upload/education/genocide-documentary.mp4',
  })
  videoUrl?: string;

  @ApiPropertyOptional({
    description: 'Duration of video/audio content in seconds',
    example: 3600,
  })
  duration?: number;

  @ApiPropertyOptional({
    description: 'Category of the educational content',
    enum: ContentCategory,
    example: ContentCategory.HISTORY,
  })
  category?: ContentCategory;

  @ApiProperty({
    description: 'Tags for categorizing and searching content',
    example: ['genocide', 'rwanda', 'history', 'tutsi'],
    type: [String],
  })
  tags: string[];

  @ApiProperty({
    description: 'Status of the educational content',
    enum: ContentStatus,
    example: ContentStatus.DRAFT,
  })
  status: ContentStatus;

  @ApiProperty({
    description: 'Whether the content is published and publicly accessible',
    example: false,
  })
  isPublished: boolean;

  @ApiProperty({
    description: 'ID of the user who created the content',
    example: 1,
  })
  userId: number;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt: Date;
}