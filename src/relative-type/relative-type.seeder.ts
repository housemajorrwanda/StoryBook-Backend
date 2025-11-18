import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type SeedEntry = {
  id: number;
  slug: string;
  displayName: string;
};

@Injectable()
export class RelativeTypeSeeder implements OnModuleInit {
  private readonly logger = new Logger(RelativeTypeSeeder.name);

  private readonly relativeTypes: SeedEntry[] = [
    { id: 1, slug: 'brother', displayName: 'Brother' },
    { id: 2, slug: 'sister', displayName: 'Sister' },
    { id: 3, slug: 'father', displayName: 'Father' },
    { id: 4, slug: 'mother', displayName: 'Mother' },
    { id: 5, slug: 'son', displayName: 'Son' },
    { id: 6, slug: 'daughter', displayName: 'Daughter' },
    { id: 7, slug: 'uncle', displayName: 'Uncle' },
    { id: 8, slug: 'aunt', displayName: 'Aunt' },
    { id: 9, slug: 'cousin', displayName: 'Cousin' },
    { id: 10, slug: 'grandfather', displayName: 'Grandfather' },
    { id: 11, slug: 'grandmother', displayName: 'Grandmother' },
    { id: 12, slug: 'nephew', displayName: 'Nephew' },
    { id: 13, slug: 'niece', displayName: 'Niece' },
    { id: 14, slug: 'neighbor', displayName: 'Neighbor' },
    { id: 15, slug: 'other', displayName: 'Other' },
  ];

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedRelativeTypes();
  }

  private async seedRelativeTypes() {
    for (const type of this.relativeTypes) {
      await this.prisma.relativeType.upsert({
        where: { slug: type.slug },
        update: { displayName: type.displayName },
        create: type,
      });
    }
    this.logger.log('Ensured relative_types entries exist');
  }
}
