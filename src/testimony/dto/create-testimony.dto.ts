/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  MaxLength,
  MinLength,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  ValidateIf,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { TestimonyImageDto } from './testimony-image.dto';

export enum SubmissionType {
  WRITTEN = 'written',
  AUDIO = 'audio',
  VIDEO = 'video',
}

export enum IdentityPreference {
  PUBLIC = 'public',
  ANONYMOUS = 'anonymous',
}

export enum RelationToEvent {
  SURVIVOR = 'Survivor',
  WITNESS = 'Witness',
  FAMILY_MEMBER = 'Family Member',
  COMMUNITY_MEMBER = 'Community Member',
  RESCUER = 'Rescuer',
  OTHER = 'Other',
}

export class CreateTestimonyDto {
  // ========== Submission Type ==========
  @ApiProperty({
    description: 'Type of testimony submission',
    enum: SubmissionType,
    example: SubmissionType.WRITTEN,
  })
  @IsEnum(SubmissionType, {
    message: 'Submission type must be written, audio, or video',
  })
  @IsNotEmpty({ message: 'Submission type is required' })
  submissionType: SubmissionType;

  // ========== Identity Preference ==========
  @ApiProperty({
    description: 'Identity preference for the testimony',
    enum: IdentityPreference,
    example: IdentityPreference.PUBLIC,
  })
  @IsEnum(IdentityPreference, {
    message: 'Identity preference must be public or anonymous',
  })
  @IsNotEmpty({ message: 'Identity preference is required' })
  identityPreference: IdentityPreference;

  // ========== Personal Information ==========
  @ApiProperty({
    description:
      'Full name of the person submitting (required if identity is public)',
    example: 'John Doe',
    required: false,
  })
  @ValidateIf((o) => o.identityPreference === IdentityPreference.PUBLIC)
  @IsString({ message: 'Full name must be a string' })
  @IsNotEmpty({ message: 'Full name is required for public identity' })
  @MinLength(2, { message: 'Full name must be at least 2 characters' })
  @MaxLength(200, { message: 'Full name must not exceed 200 characters' })
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return
  @Transform(({ value }) => value?.trim())
  fullName?: string;

  @ApiProperty({
    description: 'Relation to the event',
    enum: RelationToEvent,
    example: RelationToEvent.SURVIVOR,
    required: false,
  })
  @IsEnum(RelationToEvent, { message: 'Invalid relation to event' })
  @IsOptional()
  relationToEvent?: RelationToEvent;

  @ApiProperty({
    description: 'Name of relative (if applicable)',
    example: 'Jane Doe',
    required: false,
  })
  @IsString({ message: 'Name of relative must be a string' })
  @MaxLength(200, {
    message: 'Name of relative must not exceed 200 characters',
  })
  @IsOptional()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return
  @Transform(({ value }) => value?.trim())
  nameOfRelative?: string;

  @ApiProperty({
    description: 'Location of the event',
    example: 'Kigali, Rwanda',
    required: false,
  })
  @IsString({ message: 'Location must be a string' })
  @MaxLength(300, { message: 'Location must not exceed 300 characters' })
  @IsOptional()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return
  @Transform(({ value }) => value?.trim())
  location?: string;

  @ApiProperty({
    description: 'Date of the event',
    example: '1994-04-07',
    required: false,
  })
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  @IsOptional()
  dateOfEvent?: Date;

  // ========== Event Information ==========
  @ApiProperty({
    description: 'Title of the event/testimony',
    example: 'My Story of Survival',
  })
  @IsString({ message: 'Event title must be a string' })
  @IsNotEmpty({ message: 'Event title is required' })
  @MinLength(5, { message: 'Event title must be at least 5 characters' })
  @MaxLength(300, { message: 'Event title must not exceed 300 characters' })
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return
  @Transform(({ value }) => value?.trim())
  eventTitle: string;

  @ApiProperty({
    description: 'Brief description of the event',
    example: 'A brief overview of what happened...',
    required: false,
  })
  @IsString({ message: 'Event description must be a string' })
  @MaxLength(2000, {
    message: 'Event description must not exceed 2000 characters',
  })
  @IsOptional()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return
  @Transform(({ value }) => value?.trim())
  eventDescription?: string;

  // ========== Written Testimony (Required for WRITTEN type) ==========
  @ApiProperty({
    description:
      'Full written testimony (required for written submission type)',
    example: 'This is my full testimony...',
    required: false,
  })
  @ValidateIf((o) => o.submissionType === SubmissionType.WRITTEN)
  @IsString({ message: 'Full testimony must be a string' })
  @IsNotEmpty({ message: 'Full testimony is required for written submissions' })
  @MinLength(50, { message: 'Full testimony must be at least 50 characters' })
  @MaxLength(50000, {
    message: 'Full testimony must not exceed 50000 characters',
  })
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return
  @Transform(({ value }) => value?.trim())
  fullTestimony?: string;

  // ========== Audio Fields (Required for AUDIO type) ==========
  @ApiProperty({
    description: 'Audio file URL (required for audio submission type)',
    example: 'https://example.com/audio/testimony.mp3',
    required: false,
  })
  @ValidateIf((o) => o.submissionType === SubmissionType.AUDIO)
  @IsString({ message: 'Audio URL must be a string' })
  @IsNotEmpty({ message: 'Audio URL is required for audio submissions' })
  @MaxLength(500, { message: 'Audio URL must not exceed 500 characters' })
  audioUrl?: string;

  @ApiProperty({
    description: 'Audio file name',
    example: 'testimony-audio.mp3',
    required: false,
  })
  @ValidateIf((o) => o.submissionType === SubmissionType.AUDIO)
  @IsString({ message: 'Audio file name must be a string' })
  @IsNotEmpty({ message: 'Audio file name is required for audio submissions' })
  @MaxLength(255, { message: 'Audio file name must not exceed 255 characters' })
  audioFileName?: string;

  @ApiProperty({
    description: 'Audio duration in seconds',
    example: 180,
    required: false,
  })
  @IsInt({ message: 'Audio duration must be an integer' })
  @Min(1, { message: 'Audio duration must be at least 1 second' })
  @IsOptional()
  audioDuration?: number;

  // ========== Video Fields (Required for VIDEO type) ==========
  @ApiProperty({
    description: 'Video file URL (required for video submission type)',
    example: 'https://example.com/video/testimony.mp4',
    required: false,
  })
  @ValidateIf((o) => o.submissionType === SubmissionType.VIDEO)
  @IsString({ message: 'Video URL must be a string' })
  @IsNotEmpty({ message: 'Video URL is required for video submissions' })
  @MaxLength(500, { message: 'Video URL must not exceed 500 characters' })
  videoUrl?: string;

  @ApiProperty({
    description: 'Video file name',
    example: 'testimony-video.mp4',
    required: false,
  })
  @ValidateIf((o) => o.submissionType === SubmissionType.VIDEO)
  @IsString({ message: 'Video file name must be a string' })
  @IsNotEmpty({ message: 'Video file name is required for video submissions' })
  @MaxLength(255, { message: 'Video file name must not exceed 255 characters' })
  videoFileName?: string;

  @ApiProperty({
    description: 'Video duration in seconds',
    example: 300,
    required: false,
  })
  @IsInt({ message: 'Video duration must be an integer' })
  @Min(1, { message: 'Video duration must be at least 1 second' })
  @IsOptional()
  videoDuration?: number;

  // ========== Images (Optional for all types) ==========
  @ApiProperty({
    description: 'Array of images with descriptions',
    type: [TestimonyImageDto],
    required: false,
  })
  @IsArray({ message: 'Images must be an array' })
  @ValidateNested({ each: true })
  @Type(() => TestimonyImageDto)
  @IsOptional()
  images?: TestimonyImageDto[];

  // ========== Consent ==========
  @ApiProperty({
    description: 'Agreement to terms and conditions',
    example: true,
  })
  @IsBoolean({ message: 'Agreed to terms must be a boolean' })
  @IsNotEmpty({ message: 'You must agree to the terms and conditions' })
  @Transform(({ value }) => value === true || value === 'true')
  agreedToTerms: boolean;
}
