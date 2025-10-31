import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setAdmin(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error(`User with email ${email} not found`);
      process.exit(1);
    }

    const currentRole = (user as { role?: string }).role || 'user';

    if (currentRole === 'admin') {
      await prisma.$disconnect();
      return;
    }

    await prisma.user.update({
      where: { email },
      data: { role: 'admin' } as Record<string, unknown>,
    });
  } catch (error) {
    console.error('Error setting admin:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

const email = process.argv[2];

if (!email) {
  console.error('Usage: npx ts-node scripts/set-admin.ts <email>');
  console.error('Example: npx ts-node scripts/set-admin.ts admin@example.com');
  process.exit(1);
}

void setAdmin(email);
