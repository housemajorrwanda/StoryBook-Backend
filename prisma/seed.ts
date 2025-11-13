import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Check if admin user already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@housemajor.com' },
  });

  if (existingAdmin) {
    console.log('ℹ️  Admin user already exists, skipping seed');
    return;
  }

  await prisma.user.create({
    data: {
      email: 'admin@housemajor.com',
      fullName: 'John Doe',
      password: await bcrypt.hash('admin', 10),
      role: 'admin',
    },
  });
  console.log('✅ Admin user created');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

