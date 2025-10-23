import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../user/user.types';

export class AuthResponseDto {
  @ApiProperty({ 
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCII...........'
  })
  access_token: string;

  @ApiProperty({ 
    description: 'User information'
  })
  user: Omit<User, 'password'>;
}
