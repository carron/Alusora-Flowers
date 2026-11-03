// ALUSORA Flowers | Cloudflare Worker + D1 + Resend.
// No customer request is marked successful unless Resend accepts the email.
const PACKAGES = Object.freeze({
  'little-celebration': { name: 'Little Celebration', price: 28900, type: 'Birthday & occasions' },
  'birthday-garden': { name: 'Birthday Garden', price: 64900, type: 'Birthday & occasions' },
  'birthday-statement': { name: 'Birthday Statement', price: 169000, type: 'Birthday & occasions' },
  'gentle-tribute': { name: 'A Gentle Tribute', price: 24900, type: 'Memorial & sympathy' },
  'sacred-harmony': { name: 'Sacred Harmony', price: 28900, type: 'Church & faith' },
  'sacred-celebration': { name: 'Sacred Celebration', price: 54900, type: 'Church & faith' }
});

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const text = (v, max=400) => String(v ?? '').trim().slice(0,max);
const safeHtml = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const json = (data,status=200,headers={}) => new Response(JSON.stringify(data),{status,headers:{...JSON_HEADERS,...headers}});
const err = (message,status=400) => json({error:message},status);
const emailOK = s => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/.test(s) && s.length <= 254;
const dateOK = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(`${s}T12:00:00Z`).getTime()) && new Date(`${s}T12:00:00Z`).toISOString().slice(0,10) === s;
const torontoTomorrow = () => {
  const today = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const d=new Date(`${today}T12:00:00Z`); d.setUTCDate(d.getUTCDate()+1); return d.toISOString().slice(0,10);
};
const validDate = s => dateOK(s) && s >= torontoTomorrow() && s <= '2100-01-01';

async function readBody(request) {
  if (!(request.headers.get('content-type')||'').toLowerCase().includes('application/json')) throw {status:415,message:'Please send JSON.'};
  if (Number(request.headers.get('content-length')||'0') > 16000) throw {status:413,message:'Request too large.'};
  const raw = await request.text();
  if(raw.length>16000) throw {status:413,message:'Request too large.'};
  try { const value = JSON.parse(raw); if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(); return value; }
  catch { throw {status:400,message:'Invalid form data.'}; }
}
function requireOrigin(request) {
  const o=request.headers.get('Origin');
  if(!o || o!==new URL(request.url).origin) throw {status:403,message:'Invalid request origin.'};
}
async function sha256(v) {
  const hash=await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v));
  return Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,'0')).join('');
}
async function limit(request, env, channel, threshold, seconds) {
  const ip=request.headers.get('CF-Connecting-IP')||'unknown';
  const key=await sha256(`${channel}|${ip}|${env.SESSION_SECRET||'public-limit'}`);
  const bucket=Math.floor(Date.now()/1000/seconds);
  const {results}=await env.DB.prepare('INSERT INTO rate_limits(key,bucket,counter) VALUES(?,?,1) ON CONFLICT(key,bucket) DO UPDATE SET counter=counter+1 RETURNING counter').bind(key,bucket).all();
  if(Number(results?.[0]?.counter||0)>threshold) throw {status:429,message:'Too many requests. Please try again later.'};
}
async function verifyTurnstile(body,request,env){
  if (!env.TURNSTILE_SITE_KEY && !env.TURNSTILE_SECRET_KEY) return;
  if (!env.TURNSTILE_SITE_KEY || !env.TURNSTILE_SECRET_KEY) throw {status:503,message:'Form verification is being configured.'};
  const token=text(body.turnstileToken,2048);
  if(!token) throw {status:400,message:'Please complete the security check.'};
  const data=new FormData(); data.append('secret',env.TURNSTILE_SECRET_KEY); data.append('response',token);
  if(request.headers.get('CF-Connecting-IP')) data.append('remoteip',request.headers.get('CF-Connecting-IP'));
  const response=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:data});
  if(!response.ok) throw {status:503,message:'Security verification is unavailable. Please try again.'};
  const result=await response.json();
  if(!result.success) throw {status:400,message:'Security verification expired. Please try again.'};
}
function contact(body){
  const name=text(body.name,100),email=text(body.email,254),phone=text(body.phone,32);
  const eventDate=text(body.eventDate,20), notes=text(body.notes,900),palette=text(body.palette,130);
  if(name.length<2 || !emailOK(email)) throw {status:400,message:'Please enter a valid name and email address.'};
  if(!validDate(eventDate)) throw {status:400,message:'Choose a valid date starting tomorrow.'};
  if(phone && !/^[+0-9() .\-]{7,32}$/.test(phone)) throw {status:400,message:'Please enter a valid phone number.'};
  return {name,email,phone,eventDate,notes,palette};
}
async function sendEmail(env,subject,html,replyTo){
  if(!env.RESEND_API_KEY || !env.FROM_EMAIL || !env.CONTACT_EMAIL) throw {status:503,message:'Email delivery is not configured yet.'};
  const res=await fetch('https://api.resend.com/emails',{
    method:'POST',headers:{'Authorization':`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json'},
    body:JSON.stringify({from:env.FROM_EMAIL,to:[env.CONTACT_EMAIL],reply_to:replyTo,subject,html})
  });
  if(!res.ok){ console.error('Resend rejected email, status:',res.status); throw {status:503,message:'We could not send your request. Please try again.'}; }
  return true;
}
function mailTemplate(id,heading,rows){
  const items=rows.map(([k,v])=>`<tr><th style="text-align:left;padding:9px 18px 9px 0;vertical-align:top;color:#6b6264">${safeHtml(k)}</th><td style="padding:9px 0">${safeHtml(v)}</td></tr>`).join('');
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#29212a;max-width:680px;margin:auto;padding:30px"><h1 style="color:#802f51">${safeHtml(heading)}</h1><p>New request #${safeHtml(id)}</p><table style="border-collapse:collapse;width:100%">${items}</table><p style="font-size:12px;color:#777">Submitted through alusoraflowers.com. Reply to this email to contact the customer.</p></body></html>`;
}
function stockUpdate(items,restore=false){
  // One atomic SQL UPDATE for ALL requested variants; avoids partial stock deductions.
  const step=items.map(()=> 'WHEN ? THEN ?').join(' ');
  const ids=items.map(()=>'?').join(',');
  const values=items.flatMap(x=>[x.id,x.quantity]);
  if (restore) return {sql:`UPDATE inventory SET stock=stock + CASE id ${step} ELSE 0 END,updated_at=CURRENT_TIMESTAMP WHERE id IN (${ids})`,params:[...values,...items.map(x=>x.id)]};
  const cond=items.map(()=>'(id=? AND stock>=?)').join(' OR ');
  return {
    sql:`UPDATE inventory SET stock=stock - CASE id ${step} ELSE 0 END,updated_at=CURRENT_TIMESTAMP WHERE id IN (${ids}) AND (SELECT count(*) FROM inventory WHERE active=1 AND (${cond}))=?`,
    params:[...values,...items.map(x=>x.id),...values,items.length]
  };
}
async function handleEvent(request,env){
  requireOrigin(request);
  await limit(request,env,'event',7,3600);
  const body=await readBody(request);
  if(text(body.website,100)) return json({ok:true}); // honeypot, intentionally not submitted
  await verifyTurnstile(body,request,env);
  const info=contact(body), packageId=text(body.packageId,80), pkg=PACKAGES[packageId];
  if(!pkg) return err('Please select a floral package.');
  const guests=body.guests===''||body.guests==null?null:Number(body.guests);
  if(guests!=null && (!Number.isInteger(guests)||guests<1||guests>5000)) return err('Please enter a valid guest count.');
  if(!env.RESEND_API_KEY) return err('Email delivery is not configured yet.',503);
  const id=crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO requests(id,type,package_id,package_name,name,email,phone,event_date,guests,palette,notes,subtotal_cents,status) VALUES(?,'event',?,?,?,?,?,?,?,?,?,?,'pending_email')`)
    .bind(id,packageId,pkg.name,info.name,info.email,info.phone,info.eventDate,guests,info.palette,info.notes,pkg.price).run();
  try{
    await sendEmail(env,`New event enquiry — ${pkg.name} — ${info.eventDate}`,
      mailTemplate(id,'New floral event enquiry',[
        ['Package',pkg.name],['Starting price',`CAD $${(pkg.price/100).toFixed(2)} + applicable tax`],['Occasion',pkg.type],
        ['Name',info.name],['Email',info.email],['Phone',info.phone||'—'],['Event date',info.eventDate],['Guests',guests??'—'],
        ['Colour preferences',info.palette||'—'],['Notes',info.notes||'—']]),info.email);
    // The email API has already accepted this request. A status-update error must not
    // falsely tell the customer that the email failed.
    try { await env.DB.prepare("UPDATE requests SET status='new' WHERE id=?").bind(id).run(); }
    catch(e){ console.error('Email accepted but request status update failed:',e); }
    return json({ok:true,reference:id});
  }catch(e){
    try { await env.DB.prepare("UPDATE requests SET status='email_failed' WHERE id=?").bind(id).run(); }
    catch(e2){ console.error('Failed to flag event notification failure:',e2); }
    throw e;
  }
}
async function handleBouquet(request,env){
  requireOrigin(request);
  await limit(request,env,'bouquet',7,3600);
  const body=await readBody(request);
  if(text(body.website,100)) return json({ok:true});
  await verifyTurnstile(body,request,env);
  const info=contact(body);
  const finish=body.finish==='vase'?'vase':'wrapped';
  if(!Array.isArray(body.items)||body.items.length<1||body.items.length>24) return err('Please choose your flowers.');
  const amounts=new Map();
  for(const item of body.items){
    const id=Number(item.id),quantity=Number(item.quantity);
    if(!Number.isInteger(id)||id<1||!Number.isInteger(quantity)||quantity<1||quantity>24) return err('Invalid flower selection.');
    amounts.set(id,(amounts.get(id)||0)+quantity);
  }
  const items=[...amounts].map(([id,quantity])=>({id,quantity}));
  const count=items.reduce((n,x)=>n+x.quantity,0);
  if(count<3||count>24) return err('Please select 3 to 24 stems per bouquet.');
  if(!env.RESEND_API_KEY) return err('Email delivery is not configured yet.',503);
  const ids=items.map(()=>'?').join(',');
  const {results:variants}=await env.DB.prepare(`SELECT id,flower,color,unit_price_cents,stock,active FROM inventory WHERE id IN (${ids})`).bind(...items.map(x=>x.id)).all();
  if(variants.length!==items.length) return err('A selected flower is no longer available. Please refresh your selection.',409);
  const catalog=new Map(variants.map(x=>[x.id,x]));
  for(const item of items){
    const flower=catalog.get(item.id);
    if(!flower.active || flower.stock<item.quantity) return err(`${flower.flower} (${flower.color}) has limited stock. Please update your bouquet.`,409);
  }
  const subtotal=items.reduce((n,x)=>n+x.quantity*catalog.get(x.id).unit_price_cents,0)+(finish==='vase'?1000:0);
  const reservation=stockUpdate(items);
  const reserved=await env.DB.prepare(reservation.sql).bind(...reservation.params).run();
  if(Number(reserved.meta?.changes||0)!==items.length) return err('Some flowers sold out just now. Refresh availability and try again.',409);
  const id=crypto.randomUUID(); let saved=false;
  try{
    await env.DB.prepare(`INSERT INTO requests(id,type,name,email,phone,event_date,palette,finish,notes,subtotal_cents,status) VALUES(?,'bouquet',?,?,?,?,?,?,?,?,'pending_email')`)
      .bind(id,info.name,info.email,info.phone,info.eventDate,info.palette,finish,info.notes,subtotal).run();
    saved=true;
    const prepared=items.map(x=>({...x,...catalog.get(x.id)}));
    const stmts=prepared.map(x=>env.DB.prepare('INSERT INTO request_items(request_id,inventory_id,flower,color,quantity,unit_price_cents) VALUES(?,?,?,?,?,?)')
      .bind(id,x.id,x.flower,x.color,x.quantity,x.unit_price_cents));
    await env.DB.batch(stmts);
    const lines=prepared.map(x=>`${x.quantity} × ${x.flower} (${x.color}) — $${(x.quantity*x.unit_price_cents/100).toFixed(2)}`).join('\n');
    await sendEmail(env,`New custom bouquet request — ${info.eventDate}`,
      mailTemplate(id,'New picked-by-you bouquet',[
        ['Customer',info.name],['Email',info.email],['Phone',info.phone||'—'],['Requested date',info.eventDate],
        ['Selections',lines],['Colour mood',info.palette||'Florist’s choice'],['Finish',finish==='vase'?'Vase (+$10)':'Hand-wrapped'],
        ['Estimated subtotal',`CAD $${(subtotal/100).toFixed(2)} before applicable tax`],['Notes',info.notes||'—']]),info.email);
    // Email was accepted: stock must stay reserved even if status tracking fails.
    try { await env.DB.prepare("UPDATE requests SET status='new' WHERE id=?").bind(id).run(); }
    catch(e){ console.error('Email accepted but bouquet status update failed:',e); }
    return json({ok:true,reference:id});
  }catch(e){
    const restore=stockUpdate(items,true);
    try{await env.DB.prepare(restore.sql).bind(...restore.params).run();}catch(e2){console.error('Inventory restoration failed after email error',e2);}
    if(saved) await env.DB.prepare("UPDATE requests SET status='email_failed' WHERE id=?").bind(id).run();
    throw e;
  }
}

function b64(bytes){return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function unb64(s){const x=s.replace(/-/g,'+').replace(/_/g,'/');return Uint8Array.from(atob(x+'='.repeat((4-x.length%4)%4)),c=>c.charCodeAt(0));}
async function hmacKey(secret){return crypto.subtle.importKey('raw',new TextEncoder().encode(secret),'HMAC',false,['sign','verify']);}
async function cookieToken(env){
  const marker=(await sha256(env.ADMIN_PASSWORD)).slice(0,16);
  const payload=`v1:${Math.floor(Date.now()/1000)+8*3600}:${marker}`;
  const data=new TextEncoder().encode(payload), key=await hmacKey(env.SESSION_SECRET);
  return `${b64(data)}.${b64(new Uint8Array(await crypto.subtle.sign('HMAC',key,data)))}`;
}
async function loggedIn(request,env){
  if(!env.ADMIN_PASSWORD||!env.SESSION_SECRET) return false;
  const cookie=(request.headers.get('Cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('alusora_admin='));
  if(!cookie) return false;
  try{
    const [data64,sig64]=cookie.slice('alusora_admin='.length).split('.');
    if(!data64||!sig64) return false;
    const data=unb64(data64),payload=new TextDecoder().decode(data),sig=unb64(sig64);
    const parts=payload.split(':');
    if(parts[0]!=='v1'||!Number(parts[1])||Date.now()/1000>Number(parts[1])||parts[2]!==(await sha256(env.ADMIN_PASSWORD)).slice(0,16)) return false;
    return crypto.subtle.verify('HMAC',await hmacKey(env.SESSION_SECRET),sig,data);
  }catch{return false;}
}
async function adminRoute(request,env,url){
  const path=url.pathname;
  if(path==='/api/admin/login' && request.method==='POST'){
    requireOrigin(request);
    await limit(request,env,'admin-login',8,900);
    if(!env.ADMIN_PASSWORD||!env.SESSION_SECRET) return err('Admin login is not configured.',503);
    const body=await readBody(request);
    const a=await sha256(String(body.password||'')),b=await sha256(env.ADMIN_PASSWORD);
    let mismatch=0;for(let i=0;i<a.length;i++) mismatch|=a.charCodeAt(i)^b.charCodeAt(i);
    if(mismatch) return err('Incorrect password.',401);
    const cookie=await cookieToken(env);
    const secure=url.protocol==='https:'?'; Secure':'';
    return json({ok:true},200,{'Set-Cookie':`alusora_admin=${cookie}; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=28800${secure}`});
  }
  if(!await loggedIn(request,env)) return err('Admin sign-in required.',401);
  if(path==='/api/admin/session' && request.method==='GET') return json({ok:true});
  if(path==='/api/admin/logout' && request.method==='POST'){
    requireOrigin(request);return json({ok:true},200,{'Set-Cookie':`alusora_admin=; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=0${url.protocol==='https:'?'; Secure':''}`});
  }
  if(path==='/api/admin/inventory' && request.method==='GET'){
    const {results}=await env.DB.prepare('SELECT id,flower,color,unit_price_cents,stock,active,updated_at FROM inventory ORDER BY flower,color').all();
    return json({items:results});
  }
  if(path==='/api/admin/inventory' && request.method==='POST'){
    requireOrigin(request);
    const body=await readBody(request);
    const id=body.id==null?null:Number(body.id);
    const flower=text(body.flower,65),color=text(body.color,65),price=Number(body.price),stock=Number(body.stock),active=body.active===false?0:1;
    if(flower.length<2||color.length<2||!Number.isInteger(price)||price<1||price>100000||!Number.isInteger(stock)||stock<0||stock>50000) return err('Check flower, colour, price and available stock.');
    if(id!==null&&(!Number.isInteger(id)||id<1)) return err('Invalid inventory identifier.');
    try{
      if(id){
        const change=await env.DB.prepare('UPDATE inventory SET flower=?,color=?,unit_price_cents=?,stock=?,active=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(flower,color,price,stock,active,id).run();
        if(!change.meta?.changes) return err('Item not found.',404);
      }else await env.DB.prepare('INSERT INTO inventory(flower,color,unit_price_cents,stock,active) VALUES(?,?,?,?,?)').bind(flower,color,price,stock,active).run();
    }catch(e){if(String(e).includes('UNIQUE')) return err('That flower and colour already exist.',409);throw e;}
    return json({ok:true});
  }
  if(path==='/api/admin/requests' && request.method==='GET'){
    const {results}=await env.DB.prepare('SELECT * FROM requests ORDER BY created_at DESC LIMIT 150').all();
    const ids=results.filter(x=>x.type==='bouquet').map(x=>x.id);
    let bouquetItems=[];
    if(ids.length){const q=ids.map(()=>'?').join(',');bouquetItems=(await env.DB.prepare(`SELECT * FROM request_items WHERE request_id IN (${q})`).bind(...ids).all()).results;}
    const byId=new Map();for(const item of bouquetItems){if(!byId.has(item.request_id))byId.set(item.request_id,[]);byId.get(item.request_id).push(item);}
    return json({requests:results.map(x=>({...x,items:byId.get(x.id)||[]}))});
  }
  if(path==='/api/admin/requests/status' && request.method==='POST'){
    requireOrigin(request);
    const body=await readBody(request),id=text(body.id,90),status=text(body.status,24);
    if(!['new','contacted','completed'].includes(status) || !/^[a-f0-9-]{36}$/i.test(id)) return err('Invalid status update.');
    await env.DB.prepare("UPDATE requests SET status=? WHERE id=? AND status IN ('new','contacted','completed')").bind(status,id).run();
    return json({ok:true});
  }
  return err('Not found.',404);
}
export default {
  async fetch(request,env){
    const url=new URL(request.url),path=url.pathname;
    if(!path.startsWith('/api/')) return env.ASSETS.fetch(request);
    try{
      if(!env.DB) return err('Database is not configured.',503);
      if(path==='/api/config' && request.method==='GET') return json({turnstileSiteKey:env.TURNSTILE_SITE_KEY||''});
      if(path==='/api/inventory' && request.method==='GET'){
        const {results}=await env.DB.prepare('SELECT id,flower,color,unit_price_cents,stock FROM inventory WHERE active=1 ORDER BY flower,color').all();
        return json({items:results});
      }
      if(path==='/api/request-event' && request.method==='POST') return await handleEvent(request,env);
      if(path==='/api/request-bouquet' && request.method==='POST') return await handleBouquet(request,env);
      if(path.startsWith('/api/admin/')) return await adminRoute(request,env,url);
      return err('Not found.',404);
    }catch(e){
      if(!e.status) console.error('Unexpected API failure:',e?.message||e);
      return err(e.status?e.message:'Something went wrong. Please try again.',e.status||500);
    }
  }
};
export { PACKAGES, stockUpdate, dateOK, validDate, safeHtml };
