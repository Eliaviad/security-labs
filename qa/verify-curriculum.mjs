import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const storage = new Map();
const context = vm.createContext({
  window: {
    LABS: [],
    localStorage: {
      getItem(key) { return storage.has(key) ? storage.get(key) : null; },
      setItem(key, value) { storage.set(key, String(value)); }
    }
  },
  document: {},
  console,
  Date,
  JSON,
  Object,
  Array,
  String,
  RegExp
});

for (const file of ['assets/curriculum.js', 'assets/core.js']) {
  new vm.Script(fs.readFileSync(path.join(root, file), 'utf8'), { filename: file }).runInContext(context);
}

const paths = context.window.SECURITY_PATHS;
assert(Array.isArray(paths) && paths.length >= 6, 'curriculum needs multiple learning paths');
assert.equal(new Set(paths.map((p) => p.id)).size, paths.length, 'path ids must be unique');
const curriculumEntries = Object.values(context.window.LAB_CURRICULUM);
for (const learningPath of paths) {
  assert(curriculumEntries.some((entry) => entry.track === learningPath.id),
    `learning path ${learningPath.id} must contain at least one lab`);
}

const sample = {
  id: '99-qa-lab', order: 99, title: 'QA', description: 'QA lab', difficulty: 'medium',
  category: 'auth', env: 'node', mode: 'exploit', code: 'a\nb', vulnerableLines: [1],
  hints: ['a', 'b', 'c'], explanation: 'x'.repeat(300), exploit: { run() {}, goal: 'g', samples: ['x'] }
};
context.window.registerLab(sample);
assert.equal(sample.track, 'web-auth', 'category fallback must assign a path');
assert.equal(sample.level, 2, 'difficulty must map to a stable level');

const progress = context.window.LabProgress;
progress.markOpened(sample.id);
progress.markIdentified(sample.id);
assert.equal(progress.isComplete(sample.id), false, 'exploit lab cannot complete after line identification only');
progress.markExploited(sample.id);
assert.equal(progress.isComplete(sample.id), true, 'exploit lab completes after identification and impact proof');
progress.recordHint(sample.id);
progress.recordAttempt(sample.id);
const record = progress.get(sample.id);
assert.equal(record.hintsUsed, 1);
assert.equal(record.attempts, 1);
assert.equal(record.revealed, false, 'reveal state is independent from mastery');

console.log('QA PASS: curriculum and mastery semantics validated');
