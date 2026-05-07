require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL);

async function resetDb() {
  try {
    console.log('Dropping public schema...');
    await sql.unsafe('DROP SCHEMA public CASCADE;');
    
    console.log('Recreating public schema...');
    await sql.unsafe('CREATE SCHEMA public;');
    
    // Postgres default grants
    await sql.unsafe('GRANT ALL ON SCHEMA public TO postgres;');
    await sql.unsafe('GRANT ALL ON SCHEMA public TO public;');

    console.log('Database reset successful!');
  } catch (error) {
    console.error('Failed to reset DB:', error.message);
  } finally {
    process.exit(0);
  }
}

resetDb();
