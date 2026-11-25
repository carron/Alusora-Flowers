import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PACKAGES } from '../src/index.js';
const html = fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const css = fs.readFileSync(new URL('../public/style.css',import.meta.url),'utf8');

test('catalog has 12 items and Special dates filter comes before Small celebrations',()=>{
  assert.match(html,/All designs <span>12<\/span>/);
  const special=html.indexOf('data-filter="seasonal"');
  const birthday=html.indexOf('data-filter="birthday"');
  const all=html.indexOf('data-filter="all"');
  assert.ok(all<special && special<birthday);
  assert.match(html,/Special dates · Christmas <span>05<\/span>/);
  assert.equal((html.match(/class="package-card(?: [^"]+)?" data-category=/g)||[]).length,12);
});

test('new quote options and request buttons match backend package map',()=>{
  for(const id of ['balloon-columns','holiday-balloon-columns']){
    assert.ok(PACKAGES[id]);
    assert.equal(PACKAGES[id].price,null);
    assert.ok(html.includes(`data-package="${id}"`));
    assert.ok(html.includes(`value="${id}"`));
  }
});

test('new photographs and updated piñata-free posada asset are present and shown without cropping',()=>{
  for(const name of ['small-balloon-columns.webp','christmas-balloon-columns.webp','christmas-posada.webp']){
    const p = new URL(`../public/assets/${name}`,import.meta.url);
    assert.ok(fs.statSync(p).size>10000);
    assert.ok(html.includes('/assets/'+name));
  }
  assert.match(css,/\.balloon-column-card \.card-art > img \{[^}]*object-fit: contain/);
  assert.match(html,/Christmas Posada Arch/);
  assert.ok(!html.includes('hanging festive star'));
});
