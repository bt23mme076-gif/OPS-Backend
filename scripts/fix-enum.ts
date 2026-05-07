import 'dotenv/config';
const postgres = require('postgres');

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
  try {
    await sql`ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN'`;
    await sql`ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'MANAGER'`;
    await sql`ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'INTERN'`;
    await sql`ALTER TYPE "user_status" ADD VALUE IF NOT EXISTS 'ACTIVE'`;
    await sql`ALTER TYPE "user_status" ADD VALUE IF NOT EXISTS 'INACTIVE'`;
    await sql`ALTER TYPE "user_status" ADD VALUE IF NOT EXISTS 'PROBATION'`;
    await sql`ALTER TYPE "user_status" ADD VALUE IF NOT EXISTS 'ALUMNI'`;
    console.log('Enum values added successfully!');
  } catch (err) {
    console.error('Ignored error or failed:', err.message);
  } finally {
    process.exit(0);
  }
}

main();
