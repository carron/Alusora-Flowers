import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PACKAGES } from '../src/index.js';
const html=fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const css=fs.readFileSync(new URL('../public/style.css', import.meta.url), 'utf8');
const js=fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const asset=name=>new URL('../public/assets/'+name, import.meta.url);

test('Special dates filter and four Christmas designs are present', () => {
  assert.match(html,/data-filter="seasonal"/);
  assert.match(html,/All designs <span>10<\/span>/);
  assert.match(html,/SPECIAL DATES · CHRISTMAS EDITION/);
  assert.match(js,/seasonalIntro.hidden/);
  for(const id of ['christmas-posada','holiday-photo-corner','holiday-corporate','winter-wonderland']) {
    assert.ok(PACKAGES[id],`${id} must be accepted by Cloudflare Worker`);
    assert.equal(PACKAGES[id].price,null);
    assert.match(html,new RegExp('data-package="'+id+'"'));
    assert.match(html,new RegExp('value="'+id+'"'));
  }
});

test('Seasonal pictures are original local WEBP assets and CSS fits without crop', () => {
  for(const name of ['christmas-posada.webp','christmas-photo-corner.webp','holiday-corporate.webp','winter-wonderland.webp']) {
    assert.ok(fs.statSync(asset(name)).size>10000);
    assert.match(html,new RegExp('/assets/'+name.replace('.','\\.')));
  }
  assert.match(css,/\.seasonal-card \.card-art > img\{[^}]*object-fit:contain/);
});
