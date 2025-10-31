import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum TestimonyStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export class UpdateStatusDto {
  @ApiProperty({
    description: 'New status for the testimony',
    enum: TestimonyStatus,
    example: 'approved',
  })
  @IsEnum(TestimonyStatus, {
    message: 'Status must be one of: pending, approved, rejected',
  })
  @IsNotEmpty({ message: 'Status is required' })
  status: TestimonyStatus;

  @ApiProperty({
    description:
      'Required when rejecting (what to improve). Optional for approval.',
    example: 'Please provide more details about the date and location',
    required: false,
  })
  @IsString({ message: 'Feedback must be a string' })
  @MaxLength(2000, { message: 'Feedback must not exceed 2000 characters' })
  @IsOptional()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
  @Transform(({ value }) => value?.trim())
  feedback?: string;
}
