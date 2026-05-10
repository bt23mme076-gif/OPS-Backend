const { Pool } = require('pg');

async function check() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const res = await pool.query('SELECT * FROM tasks');
    console.log('Tasks fetched:', res.rows.length);
  } catch (err) {
    console.error('SQL Error:', err);
  }
  pool.end();
}
check();
