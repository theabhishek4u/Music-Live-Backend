const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const result = await prisma.$executeRawUnsafe('TRUNCATE TABLE "WatchSession" CASCADE;');
    console.log('Truncate success:', result);
  } catch (error) {
    console.log('Truncate error (might not exist yet):', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
