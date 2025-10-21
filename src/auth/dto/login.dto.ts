import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ 
    description: 'Username or email',
    example: 'johndoe'
  })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ 
    description: 'User password',
    example: 'password123'
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
