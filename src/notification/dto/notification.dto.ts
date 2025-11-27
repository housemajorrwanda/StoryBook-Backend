import { ApiProperty } from '@nestjs/swagger';

export class NotificationDto {
  @ApiProperty({ description: 'Notification identifier' })
  id: number;

  @ApiProperty({ description: 'Notification title' })
  title: string;

  @ApiProperty({ description: 'Detailed message', required: false })
  message?: string;

  @ApiProperty({
    description: 'Notification type identifier',
    example: 'testimony_submitted',
  })
  type: string;

  @ApiProperty({
    description: 'Intended audience',
    example: 'admin',
  })
  audience: string;

  @ApiProperty({
    description: 'Priority level',
    example: 'normal',
    default: 'normal',
  })
  priority: string;

  @ApiProperty({
    description: 'Notification status',
    example: 'unread',
  })
  status: string;

  @ApiProperty({
    description: 'Additional metadata',
    required: false,
  })
  metadata?: Record<string, unknown>;

  @ApiProperty({
    description: 'Associated user id (optional)',
    required: false,
  })
  userId?: number | null;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: Date;

  @ApiProperty({
    description: 'Read timestamp',
    required: false,
  })
  readAt?: Date | null;
}
