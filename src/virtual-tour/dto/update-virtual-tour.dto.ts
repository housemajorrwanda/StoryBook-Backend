import { PartialType } from '@nestjs/swagger';
import { CreateVirtualTourDto } from './create-virtual-tour.dto';

export class UpdateVirtualTourDto extends PartialType(CreateVirtualTourDto) {}
