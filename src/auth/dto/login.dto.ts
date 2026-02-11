import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @ApiProperty({
    description: 'User email address',
    example: 'admin@archive.com',
  })
  @IsString({ message: 'Email must be a string' })
  @IsNotEmpty({ message: 'Email is required' })
  @MaxLength(255, { message: 'Email must not exceed 255 characters' })
  @Transform(({ value }: { value: string }) => value?.trim().toLowerCase())
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'Admin@123',
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  password: string;
}
