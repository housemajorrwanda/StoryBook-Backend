import { ApiProperty } from '@nestjs/swagger';

export class UserDto {
  @ApiProperty({ description: 'The unique identifier of the user' })
  id: number;

  @ApiProperty({ description: 'The email address of the user' })
  email: string;

  @ApiProperty({ description: 'The username of the user' })
  username: string;

  @ApiProperty({ description: 'The first name of the user', required: false })
  firstName?: string;

  @ApiProperty({ description: 'The last name of the user', required: false })
  lastName?: string;

  @ApiProperty({ description: 'Whether the user account is active' })
  isActive: boolean;

  @ApiProperty({ description: 'The date when the user was created' })
  createdAt: Date;

  @ApiProperty({ description: 'The date when the user was last updated' })
  updatedAt: Date;
}
