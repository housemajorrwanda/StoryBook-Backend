import { PartialType } from '@nestjs/swagger';
import { CreateVirtualTourDto } from './create-virtual-tour.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateVirtualTourDto extends PartialType(CreateVirtualTourDto) {
  @ApiPropertyOptional({
    description: 'Whether to increment impressions count',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  incrementImpressions?: boolean;
}