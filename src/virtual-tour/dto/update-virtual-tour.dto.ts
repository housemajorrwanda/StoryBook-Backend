import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateVirtualTourDto } from './create-virtual-tour.dto';
import { IsBoolean, IsOptional } from 'class-validator';

// export class UpdateVirtualTourDto extends PartialType(CreateVirtualTourDto) {}


export class UpdateVirtualTourDto extends CreateVirtualTourDto {
  @ApiPropertyOptional({ description: 'Increment impressions count' })
  @IsOptional()
  @IsBoolean()
  incrementImpressions?: boolean;
}