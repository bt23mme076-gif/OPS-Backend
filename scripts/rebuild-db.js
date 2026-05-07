const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const backendDir = path.resolve(__dirname, '..');
const migrationsDir = path.join(backendDir, 'drizzle', 'migrations');

console.log('1. Deleting old migrations...');
if (fs.existsSync(migrationsDir)) {
  fs.rmSync(migrationsDir, { recursive: true, force: true });
}

console.log('2. Generating fresh migration...');
try {
  execSync('npx drizzle-kit generate', { cwd: backendDir, stdio: 'inherit' });
} catch (e) {
  console.error('Failed to generate migration.');
  process.exit(1);
}

console.log('3. Applying fresh migration to database...');
try {
  execSync('npx drizzle-kit migrate', { cwd: backendDir, stdio: 'inherit' });
} catch (e) {
  console.error('Failed to migrate database.');
  process.exit(1);
}

console.log('\n✅ Database successfully rebuilt and migrated!');
