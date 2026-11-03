/** ALUSORA Flowers: Cloudflare Workers + D1 + Resend. No Python server necessary. */
import { PRODUCTS, FLOWERS } from './catalog.js';

const PRODUCT_BY_ID = Object.fromEntries(PRODUCTS.map(p => [p.id,p]));
const FLOWER_BY_ID = Object.fromEntries(FLOWERS.map(f => [f.id,f]));
const PALETTES = ['Blush & cream','Winter white','Warm sunset','Florist’s choice'];
const RESPONSE_HEADERS = { 'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','x-frame-options':'DENY' };
const MONEY_FORMAT = new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'});

class PublicError extends Error { constructor(message, status=400) {super(message);this.status=status;} }
function json(payload,status=200) {return new Response(JSON.stringify(payload),{status,headers:RESPONSE_HEADERS});}
function required(value,label,max=100,min=1){if(typeof value!=='string')throw new PublicError(`${label} is required.`);const s=value.trim();if(s.length<min||s.length>max)throw new PublicError(`${label}: enter between ${min} and ${max} characters.`);return s;}
function optional(value,label,max=120){return value==null||value===''?'':required(value,label,max,0);}
function email(value){const s=required(value,'Email address',160);if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))throw new PublicError('Please enter a valid email address.');return s;}
function phone(value){const s=required(value,'Phone number',35,7);if(!/^[0-9+() .-]{7,35}$/.test(s))throw new PublicError('Please enter a valid phone number.');return s;}
function optionalInt(value,label,min,max){if(value===undefined||value===null||value==='')return null;if(!Number.isInteger(value)||value<min||value>max)throw new PublicError(`${label}: choose a whole number between ${min} and ${max}.`);return value;}
function todayToronto(){const fmt=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit'});const p=Object.fromEntries(fmt.formatToParts(new Date()).map(x=>[x.type,x.value]));return `${p.year}-${p.month}-${p.day}`;}
function datePlus(iso,days){const d=new Date(`${iso}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
function dateField(value,label,minDays=1,maxDays=730){if(typeof value!=='string'|| !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`)) || new Date(`${value}T00:00:00Z`).toISOString().slice(0,10)!==value)throw new PublicError(`${label}: please choose a valid date.`);const today=todayToronto();if(value<datePlus(today,minDays)||value>datePlus(today,maxDays))throw new PublicError(`${label}: choose a date between ${datePlus(today,minDays)} and ${datePlus(today,maxDays)}.`);return value;}
function selectionData(selection){
 if(!selection||typeof selection!=='object'||Array.isArray(selection)||!selection.stems||typeof selection.stems!=='object'||Array.isArray(selection.stems))throw new PublicError('Please select your flowers.');
 if(Object.keys(selection.stems).some(s=>!FLOWER_BY_ID[s]))throw new PublicError('Invalid flower selection.');
 let count=0,price=599; const stems={};
 for(const flower of FLOWERS){const n=selection.stems[flower.id]??0;if(!Number.isInteger(n)||n<0||n>24)throw new PublicError('Choose between 0 and 24 stems per flower.');if(n)stems[flower.id]=n;count+=n;price+=n*flower.price;}
 if(count<3||count>24)throw new PublicError('Choose between 3 and 24 flower stems.');
 const finish=selection.finish??'wrapped';if(!['wrapped','vase'].includes(finish))throw new PublicError('Invalid finish.');
 const palette=selection.palette??'Blush & cream';if(!PALETTES.includes(palette))throw new PublicError('Invalid colour palette.');
 const recipe={...stems,foliage:1,ribbon:1,card:1,[finish==='vase'?'vase':'wrap']:1};
 return {stems,finish,palette,recipe,price:price+(finish==='vase'?1000:0)};
}
function requestKey(body,requiredKey=false){if(!body.idempotency_key){if(requiredKey)throw new PublicError('Request identifier is required.');return null;}return required(body.idempotency_key,'Request identifier',100,12).match(/^[A-Za-z0-9_-]{12,100}$/)?.[0]??(()=>{throw new PublicError('Invalid request identifier.');})();}
async function hash(value){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)));return [...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('');}
function labelId(prefix){return `${prefix}-${crypto.randomUUID().slice(0,8).toUpperCase()}`;}
function ownerEmailDetails(kind,record){
 let lines=[`Reference: ${record.id}`,`Request: ${kind}`,`Name: ${record.name||record.customer_name}`,`Email: ${record.email}`,`Phone: ${record.phone}`];
 if(kind==='Picked by You'){
  const selected=JSON.parse(record.selection_json);
  const stemList=Object.entries(selected.stems).map(([k,n])=>`${k}: ${n}`).join('; ');
  lines.push(`Delivery date: ${record.delivery_date}`,`Flowers: ${stemList}`,`Finish: ${record.finish}`,`Colour palette: ${record.palette}`,`Estimated price (CAD, before HST): ${MONEY_FORMAT.format(record.estimated_price_cents/100)}`,`Comments: ${record.message||'Not provided'}`);
 }else if(kind==='Event quote'){
  lines.push(`Event date: ${record.event_date}`,`Event type: ${record.event_type||'Not provided'}`,`Estimated guests: ${record.guests??'Not provided'}`,`Floral pieces: ${record.quantity??'Not provided'}`,`Arrangements: ${record.arrangements||'Not provided'}`,`Budget: ${record.budget||'Not provided'}`,`Colour palette: ${record.palette||'Not provided'}`,`Message: ${record.message||'Not provided'}`,`Contact checkbox: ${record.consent?'Checked':'Not checked'}`);
 }else if(kind==='Order'){
  lines.push(`Pickup: ${record.pickup_date} ${record.pickup_slot}`,`Total CAD (incl HST): ${MONEY_FORMAT.format(record.total_cents/100)}`,`Notes: ${record.notes||'Not provided'}`);
 }
 return lines.join('\n')+'\n\nCustomer email is set as Reply-To.\n';
}
async function notify(env,kind,record){
 const target=env.ALUSORA_NOTIFICATION_EMAIL||'arron.cursos@gmail.com';
 if(!env.RESEND_API_KEY||!env.ALUSORA_EMAIL_FROM){console.warn(`Email not configured for ${record.id}: RESEND_API_KEY / ALUSORA_EMAIL_FROM missing`);return {sent:false};}
 try{
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);
  let response;
  try {response=await fetch('https://api.resend.com/emails',{
   method:'POST',headers:{'Authorization':`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`alusora-${record.id}`},
   body:JSON.stringify({from:env.ALUSORA_EMAIL_FROM,to:[target],reply_to:record.email,subject:`ALUSORA | ${kind} | ${record.id}`,text:ownerEmailDetails(kind,record)}),signal:controller.signal
  });}finally{clearTimeout(timer);}
  if(!response.ok){console.error(`Email rejected for ${record.id}: HTTP ${response.status}`);return {sent:false};}
  const result=await response.json().catch(()=>({}));
  if(!result?.id){console.error(`Email response missing message id for ${record.id}`);return {sent:false};}
  return {sent:true,id:result.id};
 }catch(error){console.error(`Email request failed for ${record.id}: ${error?.name||'NetworkError'}`);return {sent:false};}
}
async function safeReadBody(request){
 if(!(request.headers.get('content-type')||'').toLowerCase().includes('application/json'))throw new PublicError('Send JSON with Content-Type: application/json.',415);
 const len=Number(request.headers.get('content-length')||0);if(len>50000)throw new PublicError('Request is too large.',413);
 let body;try{body=await request.text();if(body.length>50000)throw new PublicError('Request is too large.',413);body=JSON.parse(body);}catch(e){if(e instanceof PublicError)throw e;throw new PublicError('Request body must be valid JSON.');}
 if(!body||typeof body!=='object'||Array.isArray(body))throw new PublicError('Invalid request payload.');
 if(body.website)throw new PublicError('Unable to submit this request.',400); // honeypot
 return body;
}
function requireSameOrigin(request){const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new PublicError('Requests must come from the ALUSORA website.',403);}
async function createRequest(env,kind,body){
 const common={name:required(body.name,'Name'),email:email(body.email),phone:phone(body.phone)};
 const key=requestKey(body);
 let record, table, cols, values;
 if(kind==='Event quote'){
  table='event_quotes';record={...common,event_type:optional(body.event_type,'Event type',60),event_date:dateField(body.event_date,'Event date'),guests:optionalInt(body.guests,'Guests',1,5000),quantity:optionalInt(body.quantity,'Floral pieces',1,300),arrangements:optional(body.arrangements,'Arrangements',120),budget:optional(body.budget,'Budget',50),palette:optional(body.palette,'Colour palette',80),message:optional(body.message,'Message',1200),consent:body.consent===true?1:0};
 }else{
  table='custom_requests';const choice=selectionData(body.selection);
  record={...common,delivery_date:dateField(body.delivery_date,'Delivery date'),selection_json:JSON.stringify({stems:choice.stems,finish:choice.finish,palette:choice.palette}),palette:choice.palette,finish:choice.finish,estimated_price_cents:choice.price,message:optional(body.message,'Message',300)};
 }
 const digest=await hash(record);
 let existing=key?await env.DB.prepare(`SELECT * FROM ${table} WHERE idempotency_key=?`).bind(key).first():null;
 if(existing&&existing.payload_hash!==digest)throw new PublicError('This request identifier was already used for different details. Please reload and try again.',409);
 if(!existing){
  record.id=labelId('REQ');record.idempotency_key=key;record.payload_hash=digest;
  cols=Object.keys(record);values=cols.map(c=>record[c]);
  try {await env.DB.prepare(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map(()=>'?').join(',')})`).bind(...values).run();}
  catch(e){if(key&&String(e).includes('UNIQUE')){existing=await env.DB.prepare(`SELECT * FROM ${table} WHERE idempotency_key=?`).bind(key).first();if(!existing||existing.payload_hash!==digest)throw new PublicError('This request identifier was already used.',409);}else throw e;}
 }
 const saved=existing||record;
 if(Number(saved.notification_sent)===1)return {quote_id:saved.id,notification_sent:true,already_saved:true};
 const attempt=await notify(env,kind,saved);
 if(attempt.sent){
  try{await env.DB.prepare(`UPDATE ${table} SET notification_sent=1,notification_id=? WHERE id=?`).bind(attempt.id,saved.id).run();}
  catch(e){console.error(`Notification status save failed for ${saved.id}: ${String(e)}`);}
 }
 return {quote_id:saved.id,notification_sent:attempt.sent,already_saved:!!existing};
}
async function getCatalog(env){const stockRows=await env.DB.prepare('SELECT sku,on_hand FROM inventory').all();const stock=Object.fromEntries((stockRows.results||[]).map(r=>[r.sku,r.on_hand]));
 const available=recipe=>Math.max(0,Math.min(...Object.entries(recipe).map(([sku,q])=>Math.floor((stock[sku]??0)/q))));
 return {products:PRODUCTS.map(p=>({...p,available:available(p.recipe)})),flowers:FLOWERS.map(f=>({...f,available:stock[f.id]??0})),stock,currency:'CAD',tax_rate:13,payment_mode:'pay_at_pickup'};
}
function orderItems(body){
 if(!Array.isArray(body.items)||body.items.length<1||body.items.length>16)throw new PublicError('Add 1 to 16 items.');
 let totalCount=0;const rows=[];
 for(const item of body.items){if(!item||!Number.isInteger(item.qty)||item.qty<1||item.qty>12)throw new PublicError('Each item must have quantity 1–12.');totalCount+=item.qty;
  if(item.id==='custom'){const custom=selectionData(item.choice);rows.push({label:'Build Your Bouquet',quantity:item.qty,unit_price_cents:custom.price,recipe:custom.recipe,options:{stems:custom.stems,finish:custom.finish,palette:custom.palette}});}
  else{const p=PRODUCT_BY_ID[item.id];if(!p)throw new PublicError('Product not found.');rows.push({label:p.name,quantity:item.qty,unit_price_cents:p.price,recipe:p.recipe,options:{}});}
 }
 if(totalCount>30)throw new PublicError('Maximum 30 bouquets per order.');return rows;
}
async function createOrder(env,body){
 const name=required(body.name,'Name'),customerEmail=email(body.email),customerPhone=phone(body.phone),pickupDate=dateField(body.pickup_date,'Pickup date',1,60),slot=required(body.pickup_slot,'Pickup time',20),notes=optional(body.notes,'Order notes',500),key=requestKey(body,true);
 if(!['11:00 AM','1:00 PM','3:00 PM','5:00 PM'].includes(slot))throw new PublicError('Choose an available pickup time.');
 const existing=await env.DB.prepare('SELECT * FROM orders WHERE idempotency_key=?').bind(key).first();
 if(existing)return {order_id:existing.id,total_cents:existing.total_cents,subtotal_cents:existing.subtotal_cents,tax_cents:existing.tax_cents,pickup_date:existing.pickup_date,pickup_slot:existing.pickup_slot,already_placed:true,notification_sent:!!existing.notification_sent};
 const rows=orderItems(body),needed={};for(const row of rows)for(const [sku,q] of Object.entries(row.recipe))needed[sku]=(needed[sku]??0)+q*row.quantity;
 const current=await env.DB.prepare('SELECT sku,on_hand FROM inventory').all();const stock=Object.fromEntries((current.results||[]).map(r=>[r.sku,r.on_hand]));
 if(Object.entries(needed).some(([sku,q])=>(stock[sku]??0)<q))throw new PublicError('Insufficient stock for this order. Please adjust your bag.',409);
 const subtotal=rows.reduce((s,r)=>s+r.quantity*r.unit_price_cents,0),tax=Math.round(subtotal*0.13),total=subtotal+tax,id=labelId('ALU');
 // D1.batch is atomic. Decrement directly so inventory CHECK(on_hand>=0) aborts and rolls back
 // the *entire* batch on competing orders; a conditional zero-row UPDATE does NOT roll back.
 const statements=Object.entries(needed).map(([sku,q])=>env.DB.prepare('UPDATE inventory SET on_hand=on_hand-?,updated_at=CURRENT_TIMESTAMP WHERE sku=?').bind(q,sku));
 statements.push(env.DB.prepare('INSERT INTO orders(id,idempotency_key,customer_name,email,phone,pickup_date,pickup_slot,notes,subtotal_cents,tax_cents,total_cents) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(id,key,name,customerEmail,customerPhone,pickupDate,slot,notes,subtotal,tax,total));
 for(const row of rows)statements.push(env.DB.prepare('INSERT INTO order_items(order_id,label,quantity,unit_price_cents,recipe_json,options_json) VALUES(?,?,?,?,?,?)').bind(id,row.label,row.quantity,row.unit_price_cents,JSON.stringify(row.recipe),JSON.stringify(row.options)));
 try{await env.DB.batch(statements);}catch(e){const prev=await env.DB.prepare('SELECT * FROM orders WHERE idempotency_key=?').bind(key).first();if(prev)return {order_id:prev.id,total_cents:prev.total_cents,subtotal_cents:prev.subtotal_cents,tax_cents:prev.tax_cents,pickup_date:prev.pickup_date,pickup_slot:prev.pickup_slot,already_placed:true,notification_sent:!!prev.notification_sent};if(/CHECK constraint/i.test(String(e)))throw new PublicError('Insufficient stock for this order. Please refresh your bag.',409);throw e;}
 const sent=await notify(env,'Order',{id,customer_name:name,email:customerEmail,phone:customerPhone,pickup_date:pickupDate,pickup_slot:slot,total_cents:total,notes});
 if(sent.sent)await env.DB.prepare('UPDATE orders SET notification_sent=1,notification_id=? WHERE id=?').bind(sent.id,id).run().catch(e=>console.error('Failed to mark order notified',String(e)));
 return {order_id:id,subtotal_cents:subtotal,tax_cents:tax,total_cents:total,pickup_date:pickupDate,pickup_slot:slot,payment_mode:'pay_at_pickup',notification_sent:sent.sent};
}
function checkAdmin(request,env){if(!env.ALUSORA_ADMIN_TOKEN)return false;const header=request.headers.get('authorization')||'';const candidate=header.startsWith('Bearer ')?header.slice(7):'';if(!candidate)return false;
 // Fixed-length HMAC of token strings mitigates timing differences.
 return candidate===env.ALUSORA_ADMIN_TOKEN;
}
async function adminOverview(env){
 const [inventory,orders,orderItems,quotes,custom]=await Promise.all([
  env.DB.prepare('SELECT * FROM inventory ORDER BY name').all(),env.DB.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 100').all(),env.DB.prepare('SELECT * FROM order_items ORDER BY id DESC LIMIT 1000').all(),env.DB.prepare('SELECT * FROM event_quotes ORDER BY created_at DESC LIMIT 100').all(),env.DB.prepare('SELECT * FROM custom_requests ORDER BY created_at DESC LIMIT 100').all()
 ]);
 const rows=orders.results||[];for(const order of rows){order.items=(orderItems.results||[]).filter(it=>it.order_id===order.id).map(it=>({...it,options:JSON.parse(it.options_json)}));}
 return {stock:inventory.results||[],orders:rows,quotes:quotes.results||[],custom_requests:(custom.results||[]).map(row=>({...row,selection:JSON.parse(row.selection_json)}))};
}
async function adjustStock(env,body){const sku=required(body.sku,'Stock SKU',35);const delta=body.delta;const reason=required(body.reason,'Adjustment reason',120,3);if(!Number.isInteger(delta)||delta===0||Math.abs(delta)>10000)throw new PublicError('Stock adjustment must be a non-zero whole number.');const old=await env.DB.prepare('SELECT * FROM inventory WHERE sku=?').bind(sku).first();if(!old)throw new PublicError('Unknown stock SKU.');if(old.on_hand+delta<0)throw new PublicError('Cannot reduce stock below zero.');
 try{await env.DB.batch([env.DB.prepare('UPDATE inventory SET on_hand=on_hand+?,updated_at=CURRENT_TIMESTAMP WHERE sku=?').bind(delta,sku),env.DB.prepare('INSERT INTO inventory_audit(sku,change_qty,reason) VALUES(?,?,?)').bind(sku,delta,reason)]);}catch(e){if(/CHECK constraint/i.test(String(e)))throw new PublicError('Cannot reduce stock below zero.',409);throw e;}const row=await env.DB.prepare('SELECT on_hand FROM inventory WHERE sku=?').bind(sku).first();return {sku,on_hand:row.on_hand};}
async function changeStatus(env,body,table,allowed){const id=required(body.id,'Reference',45),status=required(body.status,'Status',30);if(!allowed.includes(status))throw new PublicError('Invalid status.');const existing=await env.DB.prepare(`SELECT * FROM ${table} WHERE id=?`).bind(id).first();if(!existing)throw new PublicError('Request not found.',404);
 if(table!=='orders'){await env.DB.prepare(`UPDATE ${table} SET status=? WHERE id=?`).bind(status,id).run();return {id,status};}
 if(existing.status==='cancelled'&&status!=='cancelled')throw new PublicError('Cancelled orders cannot be reopened.');
 if(status==='cancelled'&&existing.status!=='cancelled'){
  const rows=await env.DB.prepare('SELECT quantity,recipe_json FROM order_items WHERE order_id=?').bind(id).all();const back={};for(const row of rows.results||[])for(const [sku,qty] of Object.entries(JSON.parse(row.recipe_json)))back[sku]=(back[sku]||0)+qty*row.quantity;
  // Only restore stock if order is not yet cancelled. D1 executes these as one transaction.
  const stmts=[];
  for(const [sku,qty] of Object.entries(back)){
   stmts.push(env.DB.prepare("UPDATE inventory SET on_hand=on_hand+?,updated_at=CURRENT_TIMESTAMP WHERE sku=? AND EXISTS (SELECT 1 FROM orders WHERE id=? AND status!='cancelled')").bind(qty,sku,id));
   stmts.push(env.DB.prepare("INSERT INTO inventory_audit(sku,change_qty,reason) SELECT ?,?,? WHERE EXISTS (SELECT 1 FROM orders WHERE id=? AND status!='cancelled')").bind(sku,qty,`Order cancellation ${id}`,id));
  }
  stmts.push(env.DB.prepare("UPDATE orders SET status='cancelled' WHERE id=? AND status!='cancelled'").bind(id));await env.DB.batch(stmts);
 }else await env.DB.prepare('UPDATE orders SET status=? WHERE id=?').bind(status,id).run();
 return {id,status};
}
async function handler(request,env){
 const pathname=new URL(request.url).pathname;
 if(!pathname.startsWith('/api/'))return env.ASSETS.fetch(request);
 if(!env.DB)return json({error:'Database binding is missing. Configure Cloudflare D1 binding DB.'},503);
 if(pathname==='/api/health'&&request.method==='GET'){
  try{await env.DB.prepare('SELECT id FROM event_quotes LIMIT 1').first();return json({status:'ok',backend:'cloudflare-worker',database:'ready',version:'cloudflare-2026-11-03'});}catch{ return json({status:'degraded',error:'D1 tables are not initialized. Run migrations.'},503);}
 }
 if(pathname==='/api/catalog'&&request.method==='GET')return json(await getCatalog(env));
 if(pathname==='/api/admin/overview'&&request.method==='GET'){if(!checkAdmin(request,env))return json({error:'Admin authorization required.'},401);return json(await adminOverview(env));}
 const POST_ROUTES=['/api/events','/api/custom-request','/api/orders','/api/admin/stock','/api/admin/order-status','/api/admin/quote-status','/api/admin/custom-status'];
 if(POST_ROUTES.includes(pathname)&&request.method!=='POST')return json({error:'Use the POST method for this endpoint.'},405);
 if(!POST_ROUTES.includes(pathname))return json({error:'API endpoint not found.'},404);
 requireSameOrigin(request);
 if(pathname.startsWith('/api/admin/')&&!checkAdmin(request,env))return json({error:'Admin authorization required.'},401);
 const body=await safeReadBody(request);
 if(pathname==='/api/events')return json(await createRequest(env,'Event quote',body),201);
 if(pathname==='/api/custom-request')return json(await createRequest(env,'Picked by You',body),201);
 if(pathname==='/api/orders')return json(await createOrder(env,body),201);
 if(pathname==='/api/admin/stock')return json(await adjustStock(env,body));
 if(pathname==='/api/admin/order-status')return json(await changeStatus(env,body,'orders',['confirmed','ready','collected','cancelled']));
 if(pathname==='/api/admin/quote-status')return json(await changeStatus(env,body,'event_quotes',['new','contacted','quoted','booked','closed']));
 if(pathname==='/api/admin/custom-status')return json(await changeStatus(env,body,'custom_requests',['new','contacted','quoted','booked','closed']));
 return json({error:'API endpoint not found.'},404);
}
export default {async fetch(request,env){try{return await handler(request,env);}catch(e){if(e instanceof PublicError)return json({error:e.message},e.status);const incident=crypto.randomUUID().slice(0,8);console.error(`ALUSORA API error ${incident}:`,e?.stack||String(e));return json({error:`Server error. Please try again or contact ALUSORA. (Reference ${incident})`},500);}}};
export { handler,createRequest,createOrder,selectionData,dateField,todayToronto };
