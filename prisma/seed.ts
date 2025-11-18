import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const data = [
    { slug: 'survivor', displayName: 'Survivor' },
    { slug: 'witness', displayName: 'Witness' },
    { slug: 'family_member', displayName: 'Family Member' },
    { slug: 'friend', displayName: 'Friend' },
    { slug: 'community_member', displayName: 'Community Member' },
    { slug: 'other', displayName: 'Other' },
  ];
  for (const entry of data) {
    await prisma.relativeType.upsert({
      where: { slug: entry.slug },
      update: entry,
      create: entry,
    });
  }
  console.log('✅ relative_types table seeded');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
