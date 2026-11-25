import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const js = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');

test('public page no longer contains the Picked by You section or links', () => {
  assert.doesNotMatch(html, /picked-by-you|Picked by you|Finished with flowers/i);
  assert.doesNotMatch(html, /bouquet-form|flower-grid|bouquet-builder/);
  assert.match(html, /id="packages"/);
  assert.match(html, /id="request"/);
});

test('main script does not depend on removed bouquet form', () => {
  assert.doesNotMatch(js, /bouquet-form|loadInventory|request-bouquet|data-turnstile="bouquet"/);
  assert.match(js, /api\/request-event/);
});
