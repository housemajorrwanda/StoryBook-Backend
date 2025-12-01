import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

/**
 * Pipe to extract testimony ID from URL formats:
 * - "1" -> 1
 * - "1-voices-that-refuse-silence" -> 1
 * - "123-testimony-title" -> 123
 */
@Injectable()
export class TestimonyIdPipe implements PipeTransform<unknown, number> {
  transform(value: unknown): number {
    if (value === null || value === undefined) {
      throw new BadRequestException('Testimony ID is required');
    }

    // Only allow primitive types we know how to safely stringify
    if (typeof value !== 'string' && typeof value !== 'number') {
      throw new BadRequestException(
        `Invalid testimony ID type: ${typeof value}. Expected string or number.`,
      );
    }

    // Ensure we are always working with a simple string representation
    const stringValue = typeof value === 'string' ? value : value.toString();

    // Extract ID from formats like "1" or "1-slug-here"
    const match = stringValue.match(/^(\d+)(?:-.*)?$/);
    if (!match) {
      throw new BadRequestException(
        `Invalid testimony ID format: ${stringValue}. Expected format: "id" or "id-slug"`,
      );
    }

    const idStr = match[1];
    if (!idStr) {
      throw new BadRequestException(`Invalid testimony ID: ${stringValue}`);
    }
    const id = parseInt(idStr, 10);
    if (isNaN(id) || id <= 0) {
      throw new BadRequestException(`Invalid testimony ID: ${stringValue}`);
    }

    return id;
  }
}
