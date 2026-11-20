export let passed = 0;
export async function test(name: string, fn: () => void | Promise<void>) {
  await fn();
  passed++;
  console.log(`  ✓ ${name}`);
}
export const done = () => console.log(`\n${passed} tests passed`);
