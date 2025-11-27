import { PartialType } from '@nestjs/mapped-types';
import { CreateEffectDto } from './create-effect.dto';

export class UpdateEffectDto extends PartialType(CreateEffectDto) {}
