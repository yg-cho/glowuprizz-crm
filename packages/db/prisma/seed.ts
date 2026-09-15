import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 운영 환경에서는 명시적으로 지정한 경우에만 시드 (기본 비밀번호로 계정 생성 방지)
  if (process.env.NODE_ENV === 'production' && !(process.env.SEED_OPERATOR_EMAIL && process.env.SEED_OPERATOR_PASSWORD)) {
    console.log('seed skipped (SEED_OPERATOR_EMAIL/PASSWORD not set)');
    return;
  }
  const email = process.env.SEED_OPERATOR_EMAIL ?? 'admin@glowuprizz.com';
  const password = process.env.SEED_OPERATOR_PASSWORD ?? 'Password123!';
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.operator.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash },
  });

  console.log(`seeded operator: ${email} / ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
