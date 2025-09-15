import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { Role, UserType } from '@prisma/client'; // Import Role and UserType enums

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // Seed SuperAdmin
  const superAdminEmail = process.env.SUPERADMIN_EMAIL || 'superadmin@example.com';
  const superAdminPassword = process.env.SUPERADMIN_PWD || 'ChangeMe123!'; // IMPORTANT: Change this in .env for production

  const passwordHash = await bcrypt.hash(superAdminPassword, 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: {},
    create: {
      email: superAdminEmail,
      passwordHash: passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      role: Role.SUPER_ADMIN,
      userType: UserType.NONE, // SuperAdmin has no specific userType affiliation
      emailVerified: true, // SuperAdmin is automatically verified
    },
  });
  console.log(`Created/updated SuperAdmin with ID: ${superAdmin.id}`);

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
