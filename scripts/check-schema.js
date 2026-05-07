// Run with: node scripts/check-schema.js
require('dotenv/config');
const postgres = require('postgres');
const client = postgres(process.env.DATABASE_URL);

async function main() {
  const cols = await client`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'users'
    ORDER BY ordinal_position
  `;
  console.log('\n=== USERS TABLE COLUMNS ===\n');
  cols.forEach(c => console.log(`  ${c.column_name} (${c.data_type})`));
  process.exit(0);
}
main().catch(err => { console.error('❌', err.message); process.exit(1); });
