import { ApiProperty } from '@nestjs/swagger';

export class UserDto {
  @ApiProperty({ description: 'The unique identifier of the user' })
  id: number;

  @ApiProperty({ description: 'The email address of the user' })
  email: string;

  @ApiProperty({ description: 'The full name of the user', required: false })
  fullName?: string;

  @ApiProperty({
    description: 'The resident place of the user',
    required: false,
  })
  residentPlace?: string;

  @ApiProperty({ description: 'Whether the user account is active' })
  isActive: boolean;

  @ApiProperty({ description: 'The date when the user was created' })
  createdAt: Date;

  @ApiProperty({ description: 'The date when the user was last updated' })
  updatedAt: Date;
}
