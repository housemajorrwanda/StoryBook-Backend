import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @ApiProperty({ 
    description: 'Username or email',
    example: 'johndoe'
  })
  @IsString({ message: 'Username must be a string' })
  @IsNotEmpty({ message: 'Username is required' })
  @MaxLength(255, { message: 'Username must not exceed 255 characters' })
  @Transform(({ value }) => value?.trim())
  username: string;

  @ApiProperty({ 
    description: 'User password',
    example: 'Password123!'
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  password: string;
}
