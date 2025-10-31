import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'ndizibaidu23@gmail.com';
  const adminPassword = 'Password23?';
  const adminFullName = 'Benny Chrispin';

  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    // Update to admin if not already
    if (existingAdmin.role !== 'admin') {
      await prisma.user.update({
        where: { email: adminEmail },
        data: { role: 'admin' },
      });
      console.log(`✅ Updated ${adminEmail} to admin role`);
    } else {
      console.log(`ℹ️  Admin ${adminEmail} already exists with admin role`);
    }
    return;
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  // Create admin user
  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      password: hashedPassword,
      fullName: adminFullName,
      role: 'admin',
      isActive: true,
      provider: 'local',
    },
  });

  console.log(`✅ Created admin user: ${admin.email} (ID: ${admin.id})`);
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
