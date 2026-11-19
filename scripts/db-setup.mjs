/**
 * Runs on every build (see "build" in package.json):
 *   1. prisma migrate deploy  – creates / updates the tables (idempotent)
 *   2. prisma/seed.ts         – default settings, Mon–Sat 5–9 PM hours, first admin (never overwrites)
 *
 * Without this step a fresh production database has NO tables and every booking / login request fails.
 * Set SKIP_DB_SETUP=1 to skip (e.g. a build without database access).
 */
import { spawnSync } from 'node:child_process';

const url = process.env.DATABASE_URL;
const onVercel = Boolean(process.env.VERCEL);

if (process.env.SKIP_DB_SETUP === '1') {
  console.log('[db-setup] SKIP_DB_SETUP=1 – skipped.');
  process.exit(0);
}
if (!url) {
  const msg = '[db-setup] DATABASE_URL is not set.';
  if (onVercel) {
    console.error(`${msg} Add it in Vercel → Settings → Environment Variables, then redeploy.`);
    process.exit(1);
  }
  console.warn(`${msg} Skipping database setup (local build).`);
  process.exit(0);
}

function run(cmd, args, env = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', env: { ...process.env, ...env }, shell: process.platform === 'win32' });
  if (r.status !== 0) {
    console.error(`[db-setup] "${cmd} ${args.join(' ')}" failed.`);
    process.exit(r.status ?? 1);
  }
}

// Migrations should use a direct (non-pooled) connection if one is provided (Neon / Supabase).
const migrateUrl = process.env.DIRECT_URL || url;
console.log('[db-setup] Applying database migrations…');
run('npx', ['--no-install', 'prisma', 'migrate', 'deploy'], { DATABASE_URL: migrateUrl });

if (!process.env.ADMIN_INITIAL_PASSWORD) {
  console.warn('[db-setup] ADMIN_INITIAL_PASSWORD is not set – the admin account will NOT be created until it is.');
}
console.log('[db-setup] Seeding defaults and initial admin (existing data is never overwritten)…');
run('npx', ['--no-install', 'tsx', 'prisma/seed.ts']);
console.log('[db-setup] Done.');
