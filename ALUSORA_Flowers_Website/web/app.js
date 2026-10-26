'use strict';
const $ = (sel, parent=document) => parent.querySelector(sel);
const $$ = (sel, parent=document) => [...parent.querySelectorAll(sel)];
const money = cents => new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(cents/100);
const escapeHTML = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeJSON = (v, fallback) => {try { const o=JSON.parse(v);return o??fallback; }catch{return fallback;}};
const state = {catalog:null, cart:safeJSON(localStorage.getItem('alusora_cart_v1'),[]), filter:'All', stems:{carnation:0,alstro:0,chrys:0,rose:0}, palette:'Blush & cream', finish:'wrapped', requestKey:null};
const tokenId = () => 'alu_'+(globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9_-]/g,'');
const toast = message => {const el=$('#toast');el.textContent=message;el.classList.add('visible');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('visible'),3100);};
const todayInToronto = () => new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
function isoAfter(days){const [y,m,d]=todayInToronto().split('-').map(Number);const dt=new Date(Date.UTC(y,m-1,d+days));return dt.toISOString().slice(0,10);}
function persistCart(){localStorage.setItem('alusora_cart_v1',JSON.stringify(state.cart));state.requestKey=null;renderCart();}
function useRecipe(item){if(item.id==='custom'){const recipe={...item.choice.stems,foliage:1,ribbon:1,card:1};recipe[item.choice.finish==='vase'?'vase':'wrap']=1;return recipe;}return state.catalog?.products.find(p=>p.id===item.id)?.recipe||{};}
function inCartRequirements(cart=state.cart){const need={};for(const item of cart){for(const [sku,qty] of Object.entries(useRecipe(item))){need[sku]=(need[sku]||0)+qty*item.qty;}}return need;}
function remainingCartStock(addition){const need=inCartRequirements([...state.cart,addition]);return Object.entries(need).every(([sku,qty]) => qty<=(state.catalog?.stock?.[sku]??0));}
function customPrice(choice){const unit={carnation:325,alstro:350,chrys:450,rose:625};return 599+Object.entries(choice.stems).reduce((s,[k,v])=>s+(unit[k]||0)*v,0)+(choice.finish==='vase'?1000:0);}
function customName(choice){const summary=Object.entries(choice.stems).filter(([,q])=>q>0).map(([k,q])=>`${q} ${({carnation:'carnation',alstro:'alstroemeria',chrys:'chrysanthemum',rose:'rose'})[k]}${q>1?'s':''}`).join(', ');return `Your own bouquet · ${summary}`;}
function addToBag(id,choice){if(!state.catalog){toast('Shop is still loading.');return;}
 let item;
 if(id==='custom'){
   const n=Object.values(choice.stems).reduce((a,b)=>a+b,0);
   if(n<3||n>24){toast('Please choose between 3 and 24 flower stems.');return;}
   item={id,choice,qty:1,unit_price:customPrice(choice),label:'Build Your Bouquet',artwork:'peach',detail:customName(choice)};
 }else{const p=state.catalog.products.find(p=>p.id===id);if(!p)return;item={id,qty:1,unit_price:p.price,label:p.name,artwork:p.artwork,detail:p.subtitle};}
 if(!remainingCartStock(item)){toast('Not enough flowers left for this quantity. Please adjust your bag.');return;}
 const key=JSON.stringify([item.id,item.choice||null]);
 const old=state.cart.find(x=>JSON.stringify([x.id,x.choice||null])===key);
 if(old){if(old.qty>=12){toast('Maximum 12 of the same arrangement per order.');return;}old.qty++;}
 else state.cart.push(item);
 persistCart();toast('Added to your flower bag ✿');openCart();
}
function renderProducts(){if(!state.catalog)return;const filtered=state.catalog.products.filter(p=>state.filter==='All'||p.category===state.filter);$('#product-grid').innerHTML=filtered.map(p=>`<article class="product-card"><div class="product-image tone-${escapeHTML(p.artwork)}"><span class="tag">${escapeHTML(p.tag)}</span><img src="/assets/${escapeHTML(p.artwork)}.svg" alt="Illustrative artwork for ${escapeHTML(p.name)}" loading="lazy">${p.available<=5&&p.available>0?`<span class="stock-tag">Only ${p.available} available</span>`:''}${p.available===0?'<span class="stock-tag">Sold out</span>':''}</div><div class="product-detail"><div><h3>${escapeHTML(p.name)}</h3><p>${escapeHTML(p.subtitle)}</p></div><div class="product-price">${money(p.price)}</div></div><p class="product-description">${escapeHTML(p.description)}</p><button type="button" class="product-add" data-product="${escapeHTML(p.id)}" ${p.available===0?'disabled':''}><span>${p.available===0?'Currently sold out':'Add to bag'}</span><span aria-hidden="true">${p.available===0?'—':'↗'}</span></button></article>`).join('');
 $$('.product-add').forEach(btn=>btn.addEventListener('click',()=>addToBag(btn.dataset.product)));
}
function colorForFlower(id){return ({carnation:'#d49cad',alstro:'#edb99a',chrys:'#e7d9b7',rose:'#b66477'})[id]||'#c59e87';}
function renderFlowers(){if(!state.catalog)return;
 $('#flower-options').innerHTML=state.catalog.flowers.map(f=>`<div class="flower-option"><div class="flower-identity"><span class="flower-dot" style="background:${colorForFlower(f.id)}"></span><span><strong>${escapeHTML(f.name)}</strong><small>${money(f.price)} / stem · ${f.available} left</small></span></div><div class="stepper"><button type="button" aria-label="Remove one ${escapeHTML(f.name)}" data-stem="${f.id}" data-change="-1">−</button><span id="qty-${f.id}">${state.stems[f.id]||0}</span><button type="button" aria-label="Add one ${escapeHTML(f.name)}" data-stem="${f.id}" data-change="1" ${f.available===0?'disabled':''}>+</button></div></div>`).join('');
 $$('#flower-options [data-stem]').forEach(b=>b.addEventListener('click',()=>stepFlower(b.dataset.stem,Number(b.dataset.change))));
 updateBuilder();
}
function stepFlower(id,diff){const stock=state.catalog?.stock?.[id]??0;const current=state.stems[id]||0;const total=Object.values(state.stems).reduce((a,b)=>a+b,0);if(current+diff<0||current+diff>stock||(diff>0&&total>=24))return;state.stems[id]=current+diff;updateBuilder();}
function builderChoice(){return {stems:{...state.stems},palette:state.palette,finish:state.finish};}
function updateBuilder(){const n=Object.values(state.stems).reduce((a,b)=>a+b,0);const choice=builderChoice();$('#selected-stems').textContent=`· ${n} stem${n===1?'':'s'}`;$('#builder-price').innerHTML=`${money(customPrice(choice))} <small>CAD</small>`;
 for(const f of state.catalog?.flowers||[]){const el=$(`#qty-${f.id}`);if(el)el.textContent=state.stems[f.id];}
 const canAdd=n>=3&&n<=24&&remainingCartStock({id:'custom',choice,qty:1});$('#add-custom').disabled=!canAdd;
 const note=$('#builder-message');note.classList.toggle('error',n>=3&&!canAdd);
 note.textContent=n<3?'Choose at least 3 stems to add to your bag. Colour preferences are subject to availability.':!canAdd?'This combination exceeds available stock. Please reduce the number of stems or change your finish.':'Your custom bouquet is ready to add! Colour preferences depend on seasonal availability.';
}
function cartTotals(){const subtotal=state.cart.reduce((s,it)=>s+it.qty*it.unit_price,0),tax=Math.round(subtotal*.13);return {subtotal,tax,total:subtotal+tax};}
function renderCart(){const count=state.cart.reduce((s,it)=>s+it.qty,0);$('#cart-count').textContent=count;$('#drawer-count').textContent=`(${count})`;$('#drawer-footer').hidden=!count;$('#checkout-area').hidden=!count;
 const host=$('#cart-items');if(!count){host.innerHTML='<div class="empty-cart"><div class="empty-icon">✿</div><h3>Your bag is blooming empty.</h3><p>Pick something lovely, just for you or someone special.</p></div>';return;}
 host.innerHTML=state.cart.map((it,i)=>`<div class="cart-item"><img src="/assets/${escapeHTML(it.artwork)}.svg" alt=""><div><h4>${escapeHTML(it.label)}</h4><small>${escapeHTML(it.detail||'')}</small><div class="item-actions"><button type="button" data-cart-action="decrease" data-idx="${i}" aria-label="Reduce quantity">−</button><span>${it.qty}</span><button type="button" data-cart-action="increase" data-idx="${i}" aria-label="Increase quantity">+</button><button type="button" data-cart-action="remove" class="remove-item" data-idx="${i}">Remove</button></div></div><span class="item-price">${money(it.qty*it.unit_price)}</span></div>`).join('');
 $$('#cart-items [data-cart-action]').forEach(btn=>btn.addEventListener('click',()=>changeCart(Number(btn.dataset.idx),btn.dataset.cartAction)));
 const totals=cartTotals();$('#subtotal').textContent=money(totals.subtotal);$('#tax').textContent=money(totals.tax);$('#grand-total').textContent=money(totals.total);
}
function changeCart(i,action){const it=state.cart[i];if(!it)return;if(action==='remove')state.cart.splice(i,1);else if(action==='decrease'){if(--it.qty<=0)state.cart.splice(i,1);}else if(action==='increase'){if(it.qty>=12||!remainingCartStock({...it,qty:1})){toast('That quantity exceeds available stock.');return;}it.qty++;}persistCart();updateBuilder();}
function openCart(){const el=$('#cart-drawer');$('#drawer-overlay').hidden=false;el.classList.add('open');el.setAttribute('aria-hidden','false');document.body.classList.add('drawer-open');$('#close-cart').focus();}
function closeCart(){const el=$('#cart-drawer');el.classList.remove('open');el.setAttribute('aria-hidden','true');$('#drawer-overlay').hidden=true;document.body.classList.remove('drawer-open');}
async function api(url, options={}){let response;try{response=await fetch(url,{headers:{'Content-Type':'application/json'},...options});}catch{throw new Error('Unable to connect. Please try again.');}let data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'Something went wrong.');return data;}
async function refreshCatalog(){state.catalog=await api('/api/catalog');renderProducts();renderFlowers();renderCart();}
async function placeOrder(){const form=$('#order-form');const feedback=$('#order-feedback');feedback.textContent='';feedback.classList.remove('error');if(!state.cart.length)return;if(!form.reportValidity())return;
 const values=Object.fromEntries(new FormData(form).entries());const body={...values,items:state.cart.map(it=>({id:it.id,qty:it.qty,...(it.id==='custom'?{choice:it.choice}:{})})),idempotency_key:state.requestKey||tokenId()};state.requestKey=body.idempotency_key;
 const btn=$('#place-order');btn.disabled=true;btn.textContent='Reserving your flowers...';
 try{const result=await api('/api/orders',{method:'POST',body:JSON.stringify(body)});state.cart=[];localStorage.removeItem('alusora_cart_v1');state.requestKey=null;closeCart();renderCart();const confirm=$('#confirmation-content');confirm.innerHTML=`<span>ORDER REFERENCE</span><strong>${escapeHTML(result.order_id)}</strong><span>Pickup: ${escapeHTML(result.pickup_date||values.pickup_date)} at ${escapeHTML(result.pickup_slot||values.pickup_slot)}</span><br><span>Pay at pickup: <b>${money(result.total_cents)}</b> (including HST)</span>`;$('#success-dialog').showModal();await refreshCatalog();form.reset();}
 catch(e){feedback.textContent=e.message+' Your order has not been placed.';feedback.classList.add('error');if(e.message.includes('stock')){try{await refreshCatalog();}catch{}}}
 finally{btn.disabled=false;btn.innerHTML='Place pickup order <span aria-hidden="true">↗</span>';}
}
function updateEventEstimate(){
 const form=$('#event-form'), kind=$('[name="arrangements"]',form).value, qty=Number($('[name="quantity"]',form).value);
 const ranges={'Table centrepieces':[45,80],'Gift bouquets':[20,60],'Bridal & wedding flowers':[85,160],'Venue arrangements':[90,180],'Mixed floral package':[40,120]};
 const output=$('#event-estimate');
 if(!qty||!ranges[kind]){output.innerHTML='<small>ILLUSTRATIVE STARTING RANGE</small><strong>Choose your pieces</strong><span>Planning estimate only, not a binding quote.</span>';return;}
 const [lo,hi]=ranges[kind];output.innerHTML=`<small>ILLUSTRATIVE STARTING RANGE</small><strong>${money(lo*qty*100)} – ${money(hi*qty*100)}</strong><span>Before HST, delivery, setup and any custom design. Final pricing follows an individual quote.</span>`;
}
async function submitEvent(ev){ev.preventDefault();const form=ev.currentTarget;if(!form.reportValidity())return;const feedback=$('#event-feedback');feedback.textContent='';feedback.classList.remove('error');const fields=Object.fromEntries(new FormData(form).entries());fields.guests=Number(fields.guests);fields.quantity=Number(fields.quantity);fields.consent=$('[name="consent"]',form).checked;
 const btn=$('[type="submit"]',form);btn.disabled=true;btn.textContent='Sending your request...';
 try{const result=await api('/api/events',{method:'POST',body:JSON.stringify(fields)});feedback.textContent=`Thank you! Your request ${result.quote_id} has been received. We'll review the details before providing a quote.`;form.reset();}
 catch(e){feedback.textContent=e.message;feedback.classList.add('error');}
 finally{btn.disabled=false;btn.innerHTML='Send my request <span aria-hidden="true">↗</span>';}
}
async function init(){
 $('#year').textContent=new Date().getFullYear();
 $('input[name="pickup_date"]').min=isoAfter(1);$('input[name="pickup_date"]').max=isoAfter(60);
 $('input[name="event_date"]').min=isoAfter(1);$('input[name="event_date"]').max=isoAfter(730);
 $('#open-cart').addEventListener('click',openCart);$('#close-cart').addEventListener('click',closeCart);$('#drawer-overlay').addEventListener('click',closeCart);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#cart-drawer').classList.contains('open'))closeCart();});
 $$('.pill').forEach(btn=>btn.addEventListener('click',()=>{state.filter=btn.dataset.filter;$$('.pill').forEach(b=>{b.classList.toggle('active',b===btn);b.setAttribute('aria-pressed',String(b===btn));});renderProducts();}));
 $$('.palette-btn').forEach(btn=>btn.addEventListener('click',()=>{state.palette=btn.dataset.palette;$$('.palette-btn').forEach(b=>b.classList.toggle('selected',b===btn));updateBuilder();}));
 $$('[name="finish"]').forEach(r=>r.addEventListener('change',()=>{state.finish=$('[name="finish"]:checked').value;updateBuilder();}));
 $('#add-custom').addEventListener('click',()=>addToBag('custom',builderChoice()));$('#place-order').addEventListener('click',placeOrder);
 $('#event-form').addEventListener('submit',submitEvent);
 ['arrangements','quantity'].forEach(k=>$(`[name="${k}"]`,$('#event-form')).addEventListener('change',updateEventEstimate));
 $('[name="quantity"]',$('#event-form')).addEventListener('input',updateEventEstimate);
 $('#close-success').addEventListener('click',()=>$('#success-dialog').close());$('#finish-success').addEventListener('click',()=>$('#success-dialog').close());
 try{await refreshCatalog();}catch(e){$('#product-grid').innerHTML=`<p>We couldn't load our flower shop. Please refresh. ${escapeHTML(e.message)}</p>`;$('#flower-options').innerHTML='<p>Flower selections temporarily unavailable.</p>';}
}
document.addEventListener('DOMContentLoaded',init);
