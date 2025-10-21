import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength, IsOptional, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @ApiProperty({ 
    description: 'User email address',
    example: 'user@example.com'
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @MaxLength(255, { message: 'Email must not exceed 255 characters' })
  @Transform(({ value }) => value?.trim().toLowerCase())
  email: string;

  @ApiProperty({ 
    description: 'Username for the account',
    example: 'johndoe'
  })
  @IsString({ message: 'Username must be a string' })
  @IsNotEmpty({ message: 'Username is required' })
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @MaxLength(50, { message: 'Username must not exceed 50 characters' })
  @Matches(/^[a-zA-Z0-9_-]+$/, { message: 'Username can only contain letters, numbers, underscores, and hyphens' })
  @Transform(({ value }) => value?.trim())
  username: string;

  @ApiProperty({ 
    description: 'Password (minimum 8 characters, must contain uppercase, lowercase, number, and special character)',
    example: 'Password123!',
    minLength: 8,
    maxLength: 128
  })
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    { message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)' }
  )
  password: string;

  @ApiProperty({ 
    description: 'User first name',
    example: 'John',
    required: false
  })
  @IsString({ message: 'First name must be a string' })
  @MaxLength(100, { message: 'First name must not exceed 100 characters' })
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  firstName?: string;

  @ApiProperty({ 
    description: 'User last name',
    example: 'Doe',
    required: false
  })
  @IsString({ message: 'Last name must be a string' })
  @MaxLength(100, { message: 'Last name must not exceed 100 characters' })
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  lastName?: string;
}
