// Run with: node scripts/check-users.js
require('dotenv/config');
const postgres = require('postgres');

const client = postgres(process.env.DATABASE_URL);

async function main() {
  const users = await client`SELECT id, name, email, role, status, squad FROM users`;
  
  console.log('\n=== USERS IN DATABASE ===\n');
  if (users.length === 0) {
    console.log('❌ No users found! Database might be empty or seed was never run.');
  } else {
    users.forEach(u => {
      console.log(`👤 ${u.name} | ${u.email} | ${u.role} | ${u.status} | squad: ${u.squad}`);
    });
    console.log(`\nTotal: ${users.length} user(s)`);
  }
  
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
