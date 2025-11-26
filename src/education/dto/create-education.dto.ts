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
    IsArray,
    IsNumber,
    Min,
    Max,
} from 'class-validator';

export enum ContentType {
    ARTICLE = 'article',
    VIDEO = 'video',
    INTERACTIVE = 'interactive',
    TIMELINE = 'timeline'
}

export enum ContentStatus {
    DRAFT = 'draft',
    PUBLISHED = 'published',
    ARCHIVED = 'archived'
}

export enum ContentCategory {
    HISTORY = 'history',
    PREVENTION = 'prevention',
    RECONCILIATION = 'reconciliation',
    EDUCATION = 'education'
}

export class CreateEducationDto {
    @ApiProperty({
        description: 'Title of the educational content',
        example: 'Understanding the Rwandan Genocide: Historical Context',
        minLength: 3,
        maxLength: 200,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @MaxLength(200)
    title: string;

    @ApiPropertyOptional({
        description: 'Description of the educational content',
        example: 'A comprehensive overview of the historical events leading to the 1994 genocide against the Tutsi in Rwanda',
        maxLength: 1000,
    })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    description?: string;

    @ApiPropertyOptional({
        description: 'Main content of the educational material (HTML/markdown)',
        example: '<p>This educational content provides detailed analysis...</p>',
        maxLength: 50000,
    })
    @IsOptional()
    @IsString()
    @MaxLength(50000)
    content?: string;

    @ApiProperty({
        description: 'Type of educational content',
        enum: ContentType,
        example: ContentType.ARTICLE,
    })
    @IsEnum(ContentType)
    @IsNotEmpty()
    type: ContentType;

    @ApiPropertyOptional({
        description: 'Image URL for the educational content',
        example: 'https://cloudinary.com/demo/image/upload/education/genocide-history-cover.jpg',
    })
    @IsOptional()
    @IsUrl()
    imageUrl?: string;

    @ApiPropertyOptional({
        description: 'Video URL for video content',
        example: 'https://cloudinary.com/demo/video/upload/education/genocide-documentary.mp4',
    })
    @ValidateIf((o) => o.type === ContentType.VIDEO)
    @IsUrl()
    videoUrl?: string;

    @ApiPropertyOptional({
        description: 'Duration of video/audio content in seconds',
        example: 3600,
        minimum: 1,
        maximum: 86400,
    })
    @ValidateIf((o) => o.type === ContentType.VIDEO)
    @IsNumber()
    @Min(1)
    @Max(86400)
    duration?: number;

    @ApiPropertyOptional({
        description: 'Category of the educational content',
        enum: ContentCategory,
        example: ContentCategory.HISTORY,
    })
    @IsOptional()
    @IsEnum(ContentCategory)
    category?: ContentCategory;

    @ApiPropertyOptional({
        description: 'Tags for categorizing and searching content',
        example: ['genocide', 'rwanda', 'history', 'tutsi'],
        type: [String],
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @MaxLength(50, { each: true })
    tags?: string[];

    @ApiPropertyOptional({
        description: 'Status of the educational content',
        enum: ContentStatus,
        default: ContentStatus.DRAFT,
        example: ContentStatus.DRAFT,
    })
    @IsOptional()
    @IsEnum(ContentStatus)
    status?: ContentStatus;

    @ApiPropertyOptional({
        description: 'Whether the content is published and publicly accessible',
        default: false,
        example: false,
    })
    @IsOptional()
    @IsBoolean()
    isPublished?: boolean;
}