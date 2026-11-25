import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';

test('balloon quote request reaches Resend and retains event details without invented price', async () => {
  const statements=[];
  let sent;
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async (url, options) => {
    assert.equal(url,'https://api.resend.com/emails');
    sent=JSON.parse(options.body);
    return new Response(JSON.stringify({id:'email-123'}),{status:200});
  };
  const DB={prepare(sql){
    return {bind(...args){return {all:async()=>({results:[{counter:1}]}),run:async()=>{statements.push({sql,args});return {meta:{changes:1}}}}}};
  }};
  const oldDate=new Date();oldDate.setUTCDate(oldDate.getUTCDate()+20);
  const date=oldDate.toISOString().slice(0,10);
  try {
    const request=new Request('https://alusoraflowers.com/api/request-event',{
      method:'POST',headers:{'Content-Type':'application/json','Origin':'https://alusoraflowers.com'},
      body:JSON.stringify({name:'Test Guest',email:'guest@example.com',phone:'519-555-0000',eventDate:date,
        packageId:'organic-garland',venue:'London community hall',venueType:'Indoor',budget:'$500–$1,000 CAD',
        guests:48,palette:'sage and cream',notes:'Backdrop for birthday',website:''})});
    const response=await worker.fetch(request,{DB,RESEND_API_KEY:'test-not-real',CONTACT_EMAIL:'alusoraflowers@gmail.com',FROM_EMAIL:'ALUSORA <hello@alusoraflowers.com>'});
    assert.equal(response.status,200,await response.text());
    assert.deepEqual(sent.to,['alusoraflowers@gmail.com']);
    assert.match(sent.html,/Organic Garland/);
    assert.match(sent.html,/London community hall/);
    assert.match(sent.html,/Custom quote/);
    assert.equal(statements[0].args.at(-1),null); // D1 inserts null for unknown quote
  } finally { globalThis.fetch=originalFetch; }
});
