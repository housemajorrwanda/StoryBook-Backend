import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class NotificationQueryDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  skip?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  @IsIn(['admin', 'user'])
  audience?: 'admin' | 'user';

  @IsOptional()
  @IsString()
  @IsIn(['unread', 'read'])
  status?: 'unread' | 'read';

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
