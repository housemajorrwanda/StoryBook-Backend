import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProgressContentType } from './create-userprogress.dto';

export class UserProgressResponseDto {
    @ApiProperty({
        description: 'Unique identifier for the user progress',
        example: 1,
    })
    id: number;

    @ApiProperty({
        description: 'User ID',
        example: 1,
    })
    userId: number;

    @ApiProperty({
        description: 'Type of content',
        enum: ProgressContentType,
        example: ProgressContentType.EDUCATION,
    })
    contentType: ProgressContentType;

    @ApiPropertyOptional({
        description: 'Testimony ID',
        example: 1,
    })
    testimonyId?: number;

    @ApiPropertyOptional({
        description: 'Education content ID',
        example: 1,
    })
    educationId?: number;

    @ApiPropertyOptional({
        description: 'Simulation ID',
        example: 1,
    })
    simulationId?: number;

    @ApiProperty({
        description: 'Progress percentage',
        example: 0.75,
    })
    progress: number;

    @ApiProperty({
        description: 'Whether the content is completed',
        example: false,
    })
    isCompleted: boolean;

    @ApiPropertyOptional({
        description: 'Completion timestamp',
        example: '2024-01-15T10:30:00.000Z',
    })
    completedAt?: Date;

    @ApiPropertyOptional({
        description: 'User rating',
        example: 5,
    })
    rating?: number;

    @ApiPropertyOptional({
        description: 'User feedback',
        example: 'This content was very informative.',
    })
    feedback?: string;

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