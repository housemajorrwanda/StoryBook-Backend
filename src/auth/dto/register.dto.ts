import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ 
    description: 'User email address',
    example: 'user@example.com'
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ 
    description: 'Username for the account',
    example: 'johndoe'
  })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ 
    description: 'Password (minimum 6 characters)',
    example: 'password123',
    minLength: 6
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ 
    description: 'User first name',
    example: 'John',
    required: false
  })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({ 
    description: 'User last name',
    example: 'Doe',
    required: false
  })
  @IsString()
  @IsOptional()
  lastName?: string;
}
