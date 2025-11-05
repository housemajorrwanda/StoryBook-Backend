import { ApiProperty } from '@nestjs/swagger';
import { TestimonyResponseDto } from './testimony-response.dto';

export class TestimonyComparisonDto {
  @ApiProperty({
    description: 'Current editable version of the testimony',
    type: TestimonyResponseDto,
  })
  current: TestimonyResponseDto;

  @ApiProperty({
    description: 'Last published version of the testimony (for comparison)',
    type: TestimonyResponseDto,
    required: false,
  })
  previous?: TestimonyResponseDto;

  @ApiProperty({
    description:
      'Fields that have changed between current and previous version',
    example: ['eventTitle', 'fullTestimony', 'location'],
  })
  changedFields: string[];

  @ApiProperty({
    description: 'Whether the testimony has been published before',
  })
  hasPreviousVersion: boolean;

  @ApiProperty({
    description: 'Date when the previous version was last published',
    required: false,
  })
  lastPublishedAt?: Date;

  @ApiProperty({
    description: 'Date when the current version was last edited',
    required: false,
  })
  lastEditedAt?: Date;
}
