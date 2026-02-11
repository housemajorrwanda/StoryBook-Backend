import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const relativeTypes = [
  {
    slug: 'mother',
    displayName: 'Mother',
    synonyms: 'mom,mama,mum,mummy,mommy',
  },
  {
    slug: 'father',
    displayName: 'Father',
    synonyms: 'dad,papa,daddy,baba',
  },
  {
    slug: 'grandmother',
    displayName: 'Grandmother',
    synonyms: 'grandma,granny,nana,grandmother',
  },
  {
    slug: 'grandfather',
    displayName: 'Grandfather',
    synonyms: 'grandpa,granddad,grandpapa',
  },
  {
    slug: 'brother',
    displayName: 'Brother',
    synonyms: 'bro,sibling',
  },
  {
    slug: 'sister',
    displayName: 'Sister',
    synonyms: 'sis,sibling',
  },
  {
    slug: 'uncle',
    displayName: 'Uncle',
    synonyms: null,
  },
  {
    slug: 'aunt',
    displayName: 'Aunt',
    synonyms: 'auntie',
  },
  {
    slug: 'cousin',
    displayName: 'Cousin',
    synonyms: null,
  },
];

async function main() {
  console.log('Seeding relative types...');

  for (const type of relativeTypes) {
    await prisma.relativeType.upsert({
      where: { slug: type.slug },
      update: { displayName: type.displayName, synonyms: type.synonyms },
      create: type,
    });
    console.log(`  Upserted: ${type.displayName}`);
  }

  // Remove old "parent" type if it exists (replaced by mother/father)
  const oldParent = await prisma.relativeType.findUnique({
    where: { slug: 'parent' },
  });
  if (oldParent) {
    // Check if any testimony_relatives reference it before deleting
    const usageCount = await prisma.testimonyRelative.count({
      where: { relativeTypeId: oldParent.id },
    });
    if (usageCount === 0) {
      await prisma.relativeType.delete({ where: { slug: 'parent' } });
      console.log('  Removed old "parent" type (no references)');
    } else {
      console.log(
        `  WARNING: Old "parent" type still has ${usageCount} references. Please reassign them to "mother" or "father" before removing.`,
      );
    }
  }

  // Remove old "grand-mother" / "grand_mother" type if it exists
  for (const oldSlug of ['grand-mother', 'grand_mother', 'grand mother']) {
    const old = await prisma.relativeType.findUnique({
      where: { slug: oldSlug },
    });
    if (old) {
      const usageCount = await prisma.testimonyRelative.count({
        where: { relativeTypeId: old.id },
      });
      if (usageCount === 0) {
        await prisma.relativeType.delete({ where: { slug: oldSlug } });
        console.log(`  Removed old "${oldSlug}" type (no references)`);
      } else {
        console.log(
          `  WARNING: Old "${oldSlug}" type still has ${usageCount} references. Please reassign them to "grandmother" before removing.`,
        );
      }
    }
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
