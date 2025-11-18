import { ApiProperty } from '@nestjs/swagger';

export class TestimonyImageResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  imageUrl: string;

  @ApiProperty()
  imageFileName: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  order: number;

  @ApiProperty()
  createdAt: Date;
}

export class TestimonyResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  submissionType: string;

  @ApiProperty()
  identityPreference: string;

  @ApiProperty({ required: false })
  fullName?: string;

  @ApiProperty({ required: false })
  relationToEvent?: string;

  @ApiProperty({ required: false })
  location?: string;

  @ApiProperty({ required: false })
  dateOfEventFrom?: Date;

  @ApiProperty({ required: false })
  dateOfEventTo?: Date;

  @ApiProperty()
  eventTitle: string;

  @ApiProperty({ required: false })
  eventDescription?: string;

  @ApiProperty({ required: false })
  fullTestimony?: string;

  @ApiProperty({ required: false })
  isDraft?: boolean;

  @ApiProperty({ required: false })
  draftCursorPosition?: number;

  @ApiProperty({ required: false })
  draftLastSavedAt?: Date;

  @ApiProperty({ required: false })
  audioUrl?: string;

  @ApiProperty({ required: false })
  audioFileName?: string;

  @ApiProperty({ required: false })
  audioDuration?: number;

  @ApiProperty({ required: false })
  videoUrl?: string;

  @ApiProperty({ required: false })
  videoFileName?: string;

  @ApiProperty({ required: false })
  videoDuration?: number;

  @ApiProperty({ type: [TestimonyImageResponseDto] })
  images: TestimonyImageResponseDto[];

  @ApiProperty()
  agreedToTerms: boolean;

  @ApiProperty()
  status: string;

  @ApiProperty()
  isPublished: boolean;

  @ApiProperty()
  userId: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({
    description:
      'Resume position in seconds for the current user (if logged in)',
    required: false,
  })
  resumePosition?: number;

  @ApiProperty({
    description: 'Relatives linked to this testimony',
    required: false,
    type: 'array',
  })
  relatives?: Array<{
    id: number;
    personName: string;
    notes?: string;
    order: number;
    relativeType: { id: number; slug: string; displayName: string };
  }>;
}
