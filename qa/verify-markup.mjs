import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const file of ['index.html', 'lab.html']) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length, `${file}: duplicate static element id`);
  assert(html.indexOf('assets/curriculum.js') < html.indexOf('assets/core.js'),
    `${file}: curriculum metadata must load before core normalization`);
  assert.match(html, /<meta name="viewport"/, `${file}: responsive viewport required`);
}

const css = fs.readFileSync(path.join(root, 'assets', 'styles.css'), 'utf8');
const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
assert.equal((stripped.match(/\{/g) || []).length, (stripped.match(/\}/g) || []).length,
  'styles.css: unbalanced braces');
assert(css.includes('@media (max-width: 600px)') || css.includes('@media (max-width: 620px)'),
  'mobile breakpoint required');
assert(css.includes('.lab-shell') && css.includes('.path-grid'),
  'catalog and lab workspace styles required');

console.log('QA PASS: markup, script ordering and responsive CSS validated');
