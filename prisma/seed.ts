
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
const prisma = new PrismaClient();

async function main() {
  const hashed = await bcrypt.hash('changeme', 10);
  const u = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin',
      password: hashed
    }
  });
  console.log('Seeded admin:', u.email);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
