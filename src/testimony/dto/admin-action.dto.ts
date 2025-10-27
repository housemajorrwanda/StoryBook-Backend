import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export enum TestimonyStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  REPORTED = 'reported',
  FEEDBACK_REQUESTED = 'feedback_requested',
}

export class ApproveTestimonyDto {
  @ApiProperty({
    description: 'Optional feedback message when approving',
    example: 'Thank you for sharing your testimony',
    required: false,
  })
  @IsString({ message: 'Feedback must be a string' })
  @MaxLength(2000, { message: 'Feedback must not exceed 2000 characters' })
  @IsOptional()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
  @Transform(({ value }) => value?.trim())
  feedback?: string;
}

export class RejectTestimonyDto {
  @ApiProperty({
    description: 'Reason for rejecting the testimony',
    example: 'Content does not meet community guidelines',
  })
  @IsString({ message: 'Reason must be a string' })
  @IsNotEmpty({ message: 'Reason for rejection is required' })
  @MaxLength(2000, { message: 'Reason must not exceed 2000 characters' })
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
  @Transform(({ value }) => value?.trim())
  reason: string;
}

export class ReportTestimonyDto {
  @ApiProperty({
    description: 'Reason for reporting the testimony',
    example: 'Inappropriate content or spam',
  })
  @IsString({ message: 'Reason must be a string' })
  @IsNotEmpty({ message: 'Reason for reporting is required' })
  @MaxLength(2000, { message: 'Reason must not exceed 2000 characters' })
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
  @Transform(({ value }) => value?.trim())
  reason: string;
}

export class RequestFeedbackDto {
  @ApiProperty({
    description: 'Feedback request message to the user',
    example: 'Please provide more details about the date and location',
  })
  @IsString({ message: 'Feedback message must be a string' })
  @IsNotEmpty({ message: 'Feedback message is required' })
  @MaxLength(2000, {
    message: 'Feedback message must not exceed 2000 characters',
  })
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
  @Transform(({ value }) => value?.trim())
  message: string;
}
