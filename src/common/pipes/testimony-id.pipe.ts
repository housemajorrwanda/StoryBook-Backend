import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

/**
 * Pipe to extract testimony ID from URL formats:
 * - "1" -> 1
 * - "1-voices-that-refuse-silence" -> 1
 * - "123-testimony-title" -> 123
 */
@Injectable()
export class TestimonyIdPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    if (!value) {
      throw new BadRequestException('Testimony ID is required');
    }

    // Extract ID from formats like "1" or "1-slug-here"
    const match = value.match(/^(\d+)(?:-.*)?$/);
    if (!match) {
      throw new BadRequestException(
        `Invalid testimony ID format: ${value}. Expected format: "id" or "id-slug"`,
      );
    }

    const idStr = match[1];
    if (!idStr) {
      throw new BadRequestException(`Invalid testimony ID: ${value}`);
    }
    const id = parseInt(idStr, 10);
    if (isNaN(id) || id <= 0) {
      throw new BadRequestException(`Invalid testimony ID: ${value}`);
    }

    return id;
  }
}
