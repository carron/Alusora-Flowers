import test from 'node:test';
import assert from 'node:assert/strict';
import { PACKAGES, stockUpdate, dateOK, validDate, safeHtml } from '../src/index.js';

test('all six balloon designs request quotes rather than inventing fixed prices',()=>{
  assert.deepEqual(Object.keys(PACKAGES),['little-pop','organic-garland','party-arch','statement-backdrop','balloon-bloom','corporate-pop']);
  assert.ok(Object.values(PACKAGES).every(p=>p.price===null));
});
test('stock deduction is a single atomic conditional SQL statement for all variants',()=>{
  const q=stockUpdate([{id:2,quantity:3},{id:7,quantity:4}]);
  assert.match(q.sql,/UPDATE inventory/);
  assert.match(q.sql,/SELECT count\(\*\)/);
  assert.deepEqual(q.params,[2,3,7,4,2,7,2,3,7,4,2]);
  const restore=stockUpdate([{id:2,quantity:3},{id:7,quantity:4}],true);
  assert.match(restore.sql,/stock=stock \+/);
});
test('date format and validation reject impossible dates and same-day requests',()=>{
  assert.equal(dateOK('2026-02-30'),false);
  assert.equal(dateOK('2026-12-20'),true);
  assert.equal(validDate('2000-01-01'),false);
});
test('customer content is escaped in notification HTML',()=>{
  assert.equal(safeHtml('<a href="x">&'), '&lt;a href=&quot;x&quot;&gt;&amp;');
});
