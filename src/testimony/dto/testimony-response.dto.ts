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
  nameOfRelative?: string;

  @ApiProperty({ required: false })
  location?: string;

  @ApiProperty({ required: false })
  dateOfEvent?: Date;

  @ApiProperty()
  eventTitle: string;

  @ApiProperty({ required: false })
  eventDescription?: string;

  @ApiProperty({ required: false })
  fullTestimony?: string;

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
}
