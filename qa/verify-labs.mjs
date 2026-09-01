import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(root, 'labs', 'manifest.js');
const manifestSource = fs.readFileSync(manifestPath, 'utf8');
const manifestMatch = manifestSource.match(/window\.LAB_FILES\s*=\s*\[([\s\S]*?)\]/);
assert(manifestMatch, 'manifest.js must define window.LAB_FILES');

const files = [...manifestMatch[1].matchAll(/"([^"]+\/lab\.js)"/g)].map((m) => m[1]);
assert(files.length > 0, 'manifest must list at least one lab');

const labs = [];
for (const relative of files) {
  const absolute = path.join(root, relative);
  assert(fs.existsSync(absolute), `manifest entry does not exist: ${relative}`);
  const context = vm.createContext({
    registerLab(lab) { labs.push({ ...lab, __file: relative }); },
    window: {},
    console,
    setTimeout,
    clearTimeout,
    Promise,
    JSON,
    RegExp,
    Object,
    Array,
    Date,
    Math,
  });
  new vm.Script(fs.readFileSync(absolute, 'utf8'), { filename: relative }).runInContext(context);
}

assert.equal(labs.length, files.length, 'every lab file must register exactly one lab');
assert.equal(new Set(labs.map((lab) => lab.id)).size, labs.length, 'lab ids must be unique');
assert.equal(new Set(labs.map((lab) => lab.order)).size, labs.length, 'lab orders must be unique');

const allowedDifficulties = new Set(['easy', 'medium', 'hard', 'expert']);
const allowedModes = new Set(['static', 'exploit', 'http']);
const allowedEnvironments = new Set(['browser', 'node', 'http']);

for (const lab of labs) {
  const label = `${lab.id} (${lab.__file})`;
  assert.match(lab.id, /^\d{2,3}-[a-z0-9-]+$/, `${label}: invalid id`);
  assert(Number.isInteger(lab.order) && lab.order > 0, `${label}: invalid order`);
  assert(typeof lab.title === 'string' && lab.title.trim(), `${label}: title required`);
  assert(!/[<>]/.test(lab.title), `${label}: title must be plain text`);
  assert(typeof lab.description === 'string' && lab.description.trim(), `${label}: description required`);
  assert(!/[<>]/.test(lab.description), `${label}: description must be plain text`);
  assert(allowedDifficulties.has(lab.difficulty), `${label}: invalid difficulty`);
  assert(allowedModes.has(lab.mode), `${label}: invalid mode`);
  assert(allowedEnvironments.has(lab.env), `${label}: invalid environment`);
  assert(typeof lab.category === 'string' && lab.category, `${label}: category required`);
  assert(typeof lab.code === 'string' && lab.code.includes('\n'), `${label}: code must be multiline`);
  assert(Array.isArray(lab.hints) && lab.hints.length >= 3 && lab.hints.length <= 5,
    `${label}: use 3-5 progressive hints`);
  assert(new Set(lab.hints).size === lab.hints.length, `${label}: hints must not repeat`);
  assert(typeof lab.explanation === 'string' && lab.explanation.length >= 250,
    `${label}: explanation is too shallow`);

  const lineCount = lab.code.replace(/\n$/, '').split('\n').length;
  const vulnerableLines = lab.vulnerableLines || [];
  assert(Array.isArray(vulnerableLines), `${label}: vulnerableLines must be an array`);
  for (const line of vulnerableLines) {
    assert(Number.isInteger(line) && line >= 1 && line <= lineCount,
      `${label}: vulnerable line ${line} is outside 1..${lineCount}`);
  }

  if (lab.safe === true) {
    assert.equal(vulnerableLines.length, 0, `${label}: a safe lab cannot have vulnerable lines`);
  } else {
    assert(vulnerableLines.length > 0, `${label}: vulnerable lab needs at least one answer line`);
  }

  if (lab.mode === 'exploit') {
    assert(lab.exploit && typeof lab.exploit.run === 'function', `${label}: exploit runner required`);
    assert(typeof lab.exploit.goal === 'string' && lab.exploit.goal, `${label}: exploit goal required`);
    assert(Array.isArray(lab.exploit.samples) && lab.exploit.samples.length > 0,
      `${label}: exploit samples required`);
  }

  if (lab.mode === 'http') {
    assert(lab.http && typeof lab.http === 'object', `${label}: http config required`);
    assert(typeof lab.http.basePath === 'string' && lab.http.basePath.startsWith('/lab-api/'),
      `${label}: http.basePath must stay inside /lab-api/`);
    assert(typeof lab.http.goal === 'string' && lab.http.goal, `${label}: http goal required`);
    assert(Array.isArray(lab.http.requests) && lab.http.requests.length > 0,
      `${label}: at least one request template required`);
    for (const request of lab.http.requests) {
      assert(typeof request.name === 'string' && request.name, `${label}: HTTP request name required`);
      assert(typeof request.method === 'string' && /^(GET|POST|PUT|PATCH|DELETE)$/.test(request.method),
        `${label}: invalid HTTP request method`);
      assert(typeof request.path === 'string' && request.path.startsWith(lab.http.basePath + '/'),
        `${label}: request template must stay inside its lab base path`);
      if (request.repeat !== undefined) {
        assert(Number.isInteger(request.repeat) && request.repeat >= 2 && request.repeat <= 12,
          `${label}: concurrent repeat must be an integer between 2 and 12`);
      }
    }
  }
}

const diskLabs = fs.readdirSync(path.join(root, 'labs'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => `labs/${entry.name}/lab.js`)
  .filter((relative) => fs.existsSync(path.join(root, relative)))
  .sort();
assert.deepEqual([...files].sort(), diskLabs, 'manifest and lab directories must stay in sync');

const counts = Object.groupBy(labs, (lab) => lab.mode);
console.log(`QA PASS: ${labs.length} labs validated`);
console.log(`Modes: ${Object.entries(counts).map(([mode, list]) => `${mode}=${list.length}`).join(', ')}`);
