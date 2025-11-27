// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs';


const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Starting database seed...')

    // 1. Create Relative Types
    console.log('📝 Creating relative types...')
    const relativeTypes = [
        { slug: 'father', displayName: 'Father' },
        { slug: 'mother', displayName: 'Mother' },
        { slug: 'brother', displayName: 'Brother' },
        { slug: 'sister', displayName: 'Sister' },
        { slug: 'son', displayName: 'Son' },
        { slug: 'daughter', displayName: 'Daughter' },
        { slug: 'husband', displayName: 'Husband' },
        { slug: 'wife', displayName: 'Wife' },
        { slug: 'grandfather', displayName: 'Grandfather' },
        { slug: 'grandmother', displayName: 'Grandmother' },
        { slug: 'uncle', displayName: 'Uncle' },
        { slug: 'aunt', displayName: 'Aunt' },
        { slug: 'cousin', displayName: 'Cousin' },
        { slug: 'friend', displayName: 'Friend' },
        { slug: 'witness', displayName: 'Witness' },
        { slug: 'survivor', displayName: 'Survivor' },
        { slug: 'other', displayName: 'Other' },
    ]

    for (const type of relativeTypes) {
        await prisma.relativeType.upsert({
            where: { slug: type.slug },
            update: {},
            create: type,
        })
    }
    console.log(`✅ Created ${relativeTypes.length} relative types`)

    // 2. Create Admin User
    console.log('👤 Creating admin user...')
    const adminEmail = 'admin@housemajor.com'
    const existingAdmin = await prisma.user.findUnique({
        where: { email: adminEmail },
    })

    if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash('admin123', 12)
        await prisma.user.create({
            data: {
                email: adminEmail,
                password: hashedPassword,
                fullName: 'System Administrator',
                role: 'ADMIN',
                residentPlace: 'System',
            },
        })
        console.log('✅ Created admin user: admin@housemajor.com / admin123')
    } else {
        console.log('ℹ️  Admin user already exists')
    }




    console.log('🎉 Database seeding completed successfully!')
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })