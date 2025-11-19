import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber } from 'class-validator';

export class ReorderDto {
  @ApiProperty({
    description: 'Array of IDs in the desired order',
    example: [1, 3, 2, 4],
    type: [Number],
  })
  @IsArray()
  @IsNumber({}, { each: true })
  ids: number[];
}