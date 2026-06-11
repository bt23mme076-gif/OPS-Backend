// One-off: add 'CBM' (Campus Brand Manager) to the Postgres "squad" enum.
// The frontend added CBM but the DB enum lacked it, so squad updates to CBM
// failed at the database. Idempotent. Run: node scripts/add-cbm-squad.js
const fs = require('fs');
const path = require('path');
const postgres = require('postgres');

const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
const match = env.match(/DATABASE_URL\s*=\s*"?([^"\n\r]+)"?/);
if (!match) {
  console.error('DATABASE_URL not found in .env');
  process.exit(1);
}

const sql = postgres(match[1].trim(), { max: 1 });

(async () => {
  try {
    // ADD VALUE IF NOT EXISTS runs outside a transaction (autocommit here).
    await sql.unsafe(`ALTER TYPE "squad" ADD VALUE IF NOT EXISTS 'CBM';`);
    const rows = await sql.unsafe(
      `SELECT enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'squad' ORDER BY e.enumsortorder;`,
    );
    console.log('squad enum is now:', rows.map((r) => r.enumlabel).join(', '));
    await sql.end();
    process.exit(0);
  } catch (err) {
    console.error('Failed:', err.message);
    await sql.end();
    process.exit(1);
  }
})();
