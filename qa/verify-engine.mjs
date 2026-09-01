import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const labEngine = fs.readFileSync(path.join(root, 'assets', 'lab.js'), 'utf8');
const core = fs.readFileSync(path.join(root, 'assets', 'core.js'), 'utf8');

assert(!/\beval\s*\(/.test(labEngine + core), 'engine must not use eval');
assert(!/new\s+Function\s*\(/.test(labEngine + core), 'engine must not construct functions from strings');
assert(/log\.push\([^\n]+escHtml\([^)]+\)/.test(labEngine),
  'runner output must be escaped before rendering');
assert(core.includes('.replace(/&/g, "&amp;")'), 'HTML escaping must encode ampersands first');

const revealBody = labEngine.match(/function doReveal\([^)]*\)\s*\{([\s\S]*?)\n\}/);
assert(revealBody, 'doReveal function must exist');
assert(!/markSolved|markIdentified|markExploited/.test(revealBody[1]),
  'revealing an answer must never grant mastery');
assert(/markRevealed/.test(revealBody[1]), 'reveal history should be tracked separately');

assert(labEngine.includes('url.origin !== window.location.origin'),
  'HTTP workbench must reject cross-origin destinations');
assert(labEngine.includes('url.pathname.startsWith(LAB.http.basePath + "/")'),
  'HTTP workbench must constrain requests to the current lab namespace');
assert(labEngine.includes('pre.textContent = bodyText'),
  'HTTP responses must render as text, never trusted HTML');
assert(labEngine.includes('Number(status) >= 200') && labEngine.includes('Number(status) < 400'),
  'HTTP status styling must not decide objective success');
assert(labEngine.includes('Math.min(12, Math.max(1, Number(template.repeat) || 1))'),
  'HTTP burst size must be clamped to a small safe bound');
assert(labEngine.includes('await fetch(LAB.http.statusPath') && labEngine.includes('Promise.all'),
  'concurrent HTTP labs must establish one session and issue genuinely parallel requests');

console.log('QA PASS: client engine security invariants validated');
