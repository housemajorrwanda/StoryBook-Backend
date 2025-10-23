import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength, IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class TestimonyImageDto {
  @ApiProperty({
    description: 'Image URL',
    example: 'https://example.com/images/testimony-image.jpg'
  })
  @IsString({ message: 'Image URL must be a string' })
  @IsNotEmpty({ message: 'Image URL is required' })
  @MaxLength(500, { message: 'Image URL must not exceed 500 characters' })
  imageUrl: string;

  @ApiProperty({
    description: 'Image file name',
    example: 'testimony-image.jpg'
  })
  @IsString({ message: 'Image file name must be a string' })
  @IsNotEmpty({ message: 'Image file name is required' })
  @MaxLength(255, { message: 'Image file name must not exceed 255 characters' })
  imageFileName: string;

  @ApiProperty({
    description: 'Short description of the image',
    example: 'Photo from the memorial event',
    required: false
  })
  @IsString({ message: 'Description must be a string' })
  @MaxLength(500, { message: 'Description must not exceed 500 characters' })
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  description?: string;

  @ApiProperty({
    description: 'Display order of the image',
    example: 1,
    required: false,
    default: 0
  })
  @IsInt({ message: 'Order must be an integer' })
  @Min(0, { message: 'Order must be at least 0' })
  @IsOptional()
  order?: number;
}
