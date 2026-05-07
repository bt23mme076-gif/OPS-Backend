require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL);

async function main() {
  const enumsToAdd = [
    `ALTER TYPE "user_role" ADD VALUE 'SUPER_ADMIN'`,
    `ALTER TYPE "user_role" ADD VALUE 'MANAGER'`,
    `ALTER TYPE "user_role" ADD VALUE 'INTERN'`,
    `ALTER TYPE "user_status" ADD VALUE 'ACTIVE'`,
    `ALTER TYPE "user_status" ADD VALUE 'INACTIVE'`,
    `ALTER TYPE "user_status" ADD VALUE 'PROBATION'`,
    `ALTER TYPE "user_status" ADD VALUE 'ALUMNI'`
  ];
  
  for (const query of enumsToAdd) {
    try {
      await sql.unsafe(query);
      console.log('Success:', query);
    } catch (e) {
      console.log('Skipped/Failed:', query, 'Reason:', e.message);
    }
  }
  process.exit(0);
}
main();
