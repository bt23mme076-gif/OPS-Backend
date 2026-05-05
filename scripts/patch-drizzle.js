const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Project root is parent of scripts/
const projectRoot = path.join(__dirname, '..');

// Find drizzle-kit bin.cjs — works for both npm and pnpm
function findDrizzleKit() {
  const candidates = [
    // pnpm
    path.join(projectRoot, 'node_modules/.pnpm'),
    // npm / yarn
    path.join(projectRoot, 'node_modules/drizzle-kit'),
  ];

  // pnpm nested path
  const pnpmBase = path.join(projectRoot, 'node_modules/.pnpm');

  if (fs.existsSync(pnpmBase)) {
    const dirs = fs.readdirSync(pnpmBase);
    const dkDir = dirs.find((d) => d.startsWith('drizzle-kit@'));
    if (dkDir) {
      return path.join(pnpmBase, dkDir, 'node_modules/drizzle-kit/bin.cjs');
    }
  }

  // npm
  const npmPath = path.join(projectRoot, 'node_modules/drizzle-kit/bin.cjs');
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
let patched = false;

const fixes = [
  {
    broken: 'const onUpdate = fk4.update_rule.toLowerCase();',
    fixed:  'const onUpdate = (fk4.update_rule ?? "no action").toLowerCase();'
  },
  {
    broken: 'const onDelete = fk4.delete_rule.toLowerCase();',
    fixed:  'const onDelete = (fk4.delete_rule ?? "no action").toLowerCase();'
  },
  {
    broken: 'const columnDefaultAsString = column7.column_default.toString();',
    fixed:  'const columnDefaultAsString = (column7.column_default ?? "").toString();'
  }
];


fixes.forEach(f => {
  if (content.includes(f.broken)) {
    content = content.replace(f.broken, f.fixed);
    patched = true;
  }
});

if (patched) {
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Patched drizzle-kit successfully:', filePath);
} else {
  console.log('✅ Drizzle-kit already patched or target lines not found.');
}

