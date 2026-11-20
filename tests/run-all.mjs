// Runs every test file. Works on Windows, macOS and Linux (no shell-specific env syntax).
// Files that load the notifier use an in-memory fake of @prisma/client (see tests/helpers/fake-prisma.ts).
import { spawnSync } from 'node:child_process';

const plain = ['schedule', 'dberror', 'messages', 'whatsapp'];
const withFakeDb = ['notify', 'report'];
let failed = 0;

function run(name, env = {}) {
  console.log(`\n▶ ${name}`);
  const r = spawnSync('npx', ['--no-install', 'tsx', `tests/${name}.test.ts`], {
    stdio: 'inherit',
    env: { ...process.env, ...env },
    shell: process.platform === 'win32',
  });
  if (r.status !== 0) failed++;
}

plain.forEach((n) => run(n));
withFakeDb.forEach((n) => run(n, { TSX_TSCONFIG_PATH: 'tests/tsconfig.fake.json' }));

console.log(failed ? `\n✗ ${failed} test file(s) FAILED` : '\n✓ All test files passed');
process.exit(failed ? 1 : 0);
