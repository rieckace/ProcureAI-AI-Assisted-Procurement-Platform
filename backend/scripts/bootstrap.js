const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function waitForDatabase() {
  const maxAttempts = 30;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('[bootstrap] Database is ready.');
      return;
    } catch (err) {
      console.log(`[bootstrap] Database not ready (attempt ${attempt}/${maxAttempts}) — retrying in 2s...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  throw new Error('Database did not become ready in time.');
}

async function main() {
  await waitForDatabase();

  console.log('[bootstrap] Running `prisma db push` to sync schema...');
  execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });

  if (process.env.SEED_DATABASE === 'true') {
    const orgCount = await prisma.organization.count();
    if (orgCount === 0) {
      console.log('[bootstrap] Database is empty — seeding demo data...');
      execSync('node prisma/seed.js', { stdio: 'inherit' });
    } else {
      console.log('[bootstrap] Database already has data — skipping seed.');
    }
  } else {
    console.log('[bootstrap] SEED_DATABASE is not "true" — skipping seed.');
  }

  console.log('[bootstrap] Setup complete. Starting server...');
}

main()
  .catch((err) => {
    console.error('[bootstrap] Failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
