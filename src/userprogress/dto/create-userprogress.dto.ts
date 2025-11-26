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


export enum ProgressContentType {
    TESTIMONY = 'testimony',
    EDUCATION = 'education',
    SIMULATION = 'simulation'
}

export class CreateUserprogressDto {
    @ApiProperty({
        description: 'Type of content',
        enum: ProgressContentType,
        example: ProgressContentType.EDUCATION,
    })
    @IsEnum(ProgressContentType)
    @IsNotEmpty()
    contentType: ProgressContentType;

    @ApiPropertyOptional({
        description: 'ID of the testimony (if contentType is testimony)',
        example: 1,
    })
    @ValidateIf((o) => o.contentType === ProgressContentType.TESTIMONY)
    @IsNumber()
    testimonyId?: number;

    @ApiPropertyOptional({
        description: 'ID of the educational content (if contentType is education)',
        example: 1,
    })
    @ValidateIf((o) => o.contentType === ProgressContentType.EDUCATION)
    @IsNumber()
    educationId?: number;

    @ApiPropertyOptional({
        description: 'ID of the simulation (if contentType is simulation)',
        example: 1,
    })
    @ValidateIf((o) => o.contentType === ProgressContentType.SIMULATION)
    @IsNumber()
    simulationId?: number;

    @ApiPropertyOptional({
        description: 'Progress percentage (0.0 to 1.0)',
        example: 0.75,
        minimum: 0,
        maximum: 1,
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(1)
    progress?: number;

    @ApiPropertyOptional({
        description: 'Whether the content is completed',
        example: false,
    })
    @IsOptional()
    @IsBoolean()
    isCompleted?: boolean;

    @ApiPropertyOptional({
        description: 'User rating (1-5 stars)',
        example: 5,
        minimum: 1,
        maximum: 5,
    })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(5)
    rating?: number;

    @ApiPropertyOptional({
        description: 'User feedback text',
        example: 'This content was very informative and well-presented.',
        maxLength: 2000,
    })
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    feedback?: string;
}
