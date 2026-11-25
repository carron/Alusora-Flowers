import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const page=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const admin=fs.readFileSync(new URL('../public/admin.html',import.meta.url),'utf8');
const adminJs=fs.readFileSync(new URL('../public/admin.js',import.meta.url),'utf8');
const backend=fs.readFileSync(new URL('../src/index.js',import.meta.url),'utf8');

test('ALUSORA is the only brand name shown on the site and staff pages',()=>{
  for(const src of [page,admin,adminJs,backend]) {
    assert.doesNotMatch(src,/ALUSORA\s+Flowers|ALUSORA\s*<small>FLOWERS/i);
  }
  assert.match(page,/<title>ALUSORA \| Balloon/);
  assert.match(page,/<span>ALUSORA<\/span>/);
  assert.match(admin,/<span>ALUSORA<\/span>/);
  assert.match(page,/https:\/\/alusoraflowers\.com\//);
});
