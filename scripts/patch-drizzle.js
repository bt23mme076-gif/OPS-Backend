const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Find drizzle-kit bin.cjs — works for both npm and pnpm
function findDrizzleKit() {
  const candidates = [
    // pnpm
    path.join(__dirname, 'node_modules/.pnpm'),
    // npm / yarn
    path.join(__dirname, 'node_modules/drizzle-kit'),
  ];

  // pnpm nested path
  const pnpmBase = path.join(__dirname, 'node_modules/.pnpm');
  if (fs.existsSync(pnpmBase)) {
    const dirs = fs.readdirSync(pnpmBase);
    const dkDir = dirs.find((d) => d.startsWith('drizzle-kit@'));
    if (dkDir) {
      return path.join(pnpmBase, dkDir, 'node_modules/drizzle-kit/bin.cjs');
    }
  }

  // npm
  const npmPath = path.join(__dirname, 'node_modules/drizzle-kit/bin.cjs');
  if (fs.existsSync(npmPath)) return npmPath;

  return null;
}

const filePath = findDrizzleKit();

if (!filePath) {
  console.error('❌ drizzle-kit not found. Run pnpm install first.');
  process.exit(0);
}

if (!fs.existsSync(filePath)) {
  console.error('❌ bin.cjs not found at:', filePath);
  process.exit(0);
}

let content = fs.readFileSync(filePath, 'utf8');

const BROKEN = 'const onUpdate = fk4.update_rule.toLowerCase();';
const FIXED   = 'const onUpdate = (fk4.update_rule ?? "no action").toLowerCase();';

if (content.includes(FIXED)) {
  console.log('✅ Already patched. Nothing to do.');
  process.exit(0);
}

if (!content.includes(BROKEN)) {
  console.error('❌ Could not find the target line. drizzle-kit version may have changed.');
  console.error('   Look for: ' + BROKEN);
  process.exit(0);
}

content = content.replace(BROKEN, FIXED);
fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Patched drizzle-kit successfully:', filePath);
