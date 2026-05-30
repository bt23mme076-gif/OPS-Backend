// Run with: node scripts/add-superadmin.js
require('dotenv/config');
const postgres = require('postgres');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const client = postgres(process.env.DATABASE_URL);

async function main() {
  const email = 'nitinrai2266@gmail.com';
  const password = 'Admin@123'; // You can change this after logging in

  // Check if already exists
  const existing = await client`SELECT id FROM users WHERE email = ${email}`;
  if (existing.length > 0) {
    console.log('✅ User already exists!');
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await client`
    INSERT INTO users (id, name, email, password_hash, role, status)
    VALUES (
      ${uuidv4()},
      'Nitin Rai',
      ${email},
      ${passwordHash},
      'SUPER_ADMIN',
      'ACTIVE'
    )
  `;

  console.log('✅ Super Admin created!');
  console.log(`   Email:    ${email}`);
  console.log(`   Password: ${password}`);
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
