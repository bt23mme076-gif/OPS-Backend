require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL);

async function main() {
  try {
    await sql.unsafe(`DROP TABLE IF EXISTS "tasks" CASCADE;`);
    console.log('Tasks table dropped successfully.');
  } catch (e) {
    console.log('Error dropping tasks table:', e.message);
  }
  process.exit(0);
}
main();
