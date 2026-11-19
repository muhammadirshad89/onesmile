import assert from 'node:assert/strict';
import { classifyError } from '../src/lib/dberror';

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
}

console.log('dberror');
test('missing table (P2021) => DB_NOT_READY, 503, friendly public text', () => {
  const f = classifyError({ code: 'P2021', message: 'The table `public.WorkingHour` does not exist' });
  assert.equal(f.code, 'DB_NOT_READY');
  assert.equal(f.status, 503);
  assert.ok(!/prisma|table|P2021/i.test(f.publicMessage));
  assert.match(f.logReason, /migrate deploy/);
});
test('raw postgres "relation does not exist" => DB_NOT_READY', () => {
  assert.equal(classifyError(new Error('relation "AdminUser" does not exist')).code, 'DB_NOT_READY');
});
test('cannot reach DB => DB_UNAVAILABLE', () => {
  assert.equal(classifyError({ name: 'PrismaClientInitializationError', message: "Can't reach database server" }).code, 'DB_UNAVAILABLE');
  assert.equal(classifyError({ code: 'P1001', message: 'x' }).code, 'DB_UNAVAILABLE');
  assert.equal(classifyError(new Error('Environment variable not found: DATABASE_URL.')).code, 'DB_UNAVAILABLE');
});
test('missing SESSION_SECRET => CONFIG_ERROR', () => {
  assert.equal(classifyError(new Error('SESSION_SECRET must be set to a random string of 32+ characters.')).code, 'CONFIG_ERROR');
});
test('anything else => 500 SERVER_ERROR without leaking details', () => {
  const f = classifyError(new Error('boom secret detail'));
  assert.equal(f.status, 500);
  assert.ok(!f.publicMessage.includes('secret'));
});
console.log(`\n${passed} tests passed`);
