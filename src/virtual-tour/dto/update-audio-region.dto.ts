import { PartialType } from '@nestjs/mapped-types';
import { CreateAudioRegionDto } from './create-audio-region.dto';

export class UpdateAudioRegionDto extends PartialType(CreateAudioRegionDto) {}