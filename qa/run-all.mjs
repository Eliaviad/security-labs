import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const script of [
  'qa/verify-labs.mjs',
  'qa/verify-engine.mjs',
  'qa/verify-curriculum.mjs',
  'qa/verify-markup.mjs',
  'qa/verify-live-server.mjs'
]) {
  const result = spawnSync(process.execPath, [path.join(root, script)], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log('QA SUITE PASS');
