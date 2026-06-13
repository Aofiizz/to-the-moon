import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function main() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin1234';

  console.log(`Seeding database...`);

  // Check if admin user already exists
  const existingUser = await prisma.user.findFirst({
    where: { username }
  });

  if (existingUser) {
    console.log(`Admin user '${username}' already exists. Skipping.`);
    return;
  }

  const passwordHash = hashPassword(password);

  const admin = await prisma.user.create({
    data: {
      username,
      passwordHash
    }
  });

  console.log(`Admin user created successfully: ${admin.username}`);
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
