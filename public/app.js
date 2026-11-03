(() => {
  'use strict';
  const money = cents => (cents / 100).toLocaleString('en-CA',{style:'currency',currency:'CAD'});
  const chosen = new Map();
  const selectedVariantByFlower = new Map();
  let inventory = [];
  let palette = 'Blush & cream';
  let turnstileEnabled = false;
  const turnstileIds = {};
  const turnstileTokens = {};
  const el = id => document.getElementById(id);
  const colorHex = color => ({
    blush:'#e9a6b9',ivory:'#fff8e9',burgundy:'#7b304b',white:'#fff',yellow:'#f5d16c',
    lavender:'#c9b0da',cream:'#f9e5c9',red:'#c94861',pink:'#f6abc3',peach:'#f7b299',
    coral:'#ee8d81',"florist’s choice":'#c1ad91',"florist's choice":'#c1ad91'
  }[color.toLowerCase()] || '#b9aa98');

  function tomorrowToronto(){
    const today = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const d = new Date(today+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10);
  }
  document.querySelectorAll('input[type="date"]').forEach(input => input.min = tomorrowToronto());
  el('year').textContent = new Date().getFullYear();
  const menu = document.querySelector('.nav-toggle'), nav=el('primary-nav');
  menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));menu.textContent=open?'✕':'☰';});
  nav.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.textContent='☰';}));

  document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
    const target=button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(x=>{x.classList.toggle('active',x===button);x.setAttribute('aria-pressed',String(x===button));});
    document.querySelectorAll('.package-card').forEach(card=>card.hidden=target!=='all' && card.dataset.category!==target);
  }));
  document.querySelectorAll('.request-package').forEach(button=>button.addEventListener('click',()=>{
    el('event-package').value=button.dataset.package;
    el('request').scrollIntoView({behavior:'smooth',block:'start'});
    el('event-package').focus({preventScroll:true});
  }));

  async function api(path,options={}){
    const response=await fetch(path,{credentials:'same-origin',...options});
    let data={};try{data=await response.json();}catch{}
    if(!response.ok) throw new Error(data.error||'Sorry, something went wrong. Please try again.');
    return data;
  }
  function node(tag,klass,content){ const n=document.createElement(tag);if(klass)n.className=klass;if(content!==undefined)n.textContent=content;return n; }
  function btn(label,klass,handler,disabled=false){const b=node('button',klass,label);b.type='button';b.disabled=disabled;b.addEventListener('click',handler);return b;}
  function groupInventory(){
    const byName=new Map();for(const item of inventory){if(!byName.has(item.flower))byName.set(item.flower,[]);byName.get(item.flower).push(item);}
    return byName;
  }
  async function loadInventory(){
    try{
      const data=await api('/api/inventory');inventory=data.items||[];
      const variants=new Map(inventory.map(x=>[x.id,x]));
      for(const [id,qty] of chosen){ const v=variants.get(id);if(!v||!v.stock) chosen.delete(id);else if(qty>v.stock)chosen.set(id,v.stock); }
      renderFlowers();renderSummary();
      el('inventory-status').textContent=inventory.some(x=>x.stock>0)?'Freshly updated availability · Select a bloom below':'Our fresh flowers are being restocked. Please check back soon, or explore our event packages.';
    }catch(e){inventory=[];chosen.clear();renderFlowers();renderSummary();el('inventory-status').textContent='Flower availability is temporarily unavailable. Please try again shortly.';}
  }
  function renderFlowers(){
    const root=el('flower-grid');root.replaceChildren();
    const groups=groupInventory();
    if(!groups.size){const msg=node('div','visually-muted','Our flower selection is being refreshed. Please come back soon.');root.append(msg);return;}
    for(const [flower,variants] of groups){
      const available=variants.filter(x=>x.stock>0);
      const picked=selectedVariantByFlower.get(flower);
      let active=variants.find(x=>x.id===picked);
      if(!active || (active.stock===0 && available.length))active=available[0]||variants[0];
      selectedVariantByFlower.set(flower,active.id);
      const card=node('div','flower-item'+(available.length?'':' soldout'));
      const title=node('div','flower-title');title.append(node('strong','',flower),node('small','',`From ${money(Math.min(...variants.map(x=>x.unit_price_cents)))}/stem`));card.append(title);
      card.append(node('p','',available.length?'Select a colour & quantity':'Temporarily out of stock · more blooms soon'));
      const colors=node('div','variant-row');
      for(const v of variants){
        const chip=btn(v.color,'variant-color'+(v.id===active.id?' active':''),()=>{selectedVariantByFlower.set(flower,v.id);renderFlowers();},v.stock===0);
        const swatch=node('i');swatch.style.setProperty('--swatch',colorHex(v.color));chip.prepend(swatch);
        chip.title=v.stock===0?`${v.color} — currently sold out`:v.color;
        chip.setAttribute('aria-pressed',String(v.id===active.id));colors.append(chip);
      }
      card.append(colors);
      const row=node('div','quantity-row');
      const stock=node('span','stock-info',active.stock>0?`${active.stock} available · ${money(active.unit_price_cents)}/stem`:'Currently sold out');
      const stepper=node('div','stepper');
      const n=chosen.get(active.id)||0;
      const minus=btn('−','',()=>change(active.id,-1),n===0);
      minus.setAttribute('aria-label',`Remove one ${active.color} ${flower}`);
      const count=node('output','',String(n));count.setAttribute('aria-label',`${n} stems selected`);
      const plus=btn('+','',()=>change(active.id,1),active.stock===0||n>=active.stock||totalStems()>=24);
      plus.setAttribute('aria-label',`Add one ${active.color} ${flower}`);
      stepper.append(minus,count,plus);row.append(stock,stepper);card.append(row);root.append(card);
    }
  }
  function totalStems(){return [...chosen.values()].reduce((sum,n)=>sum+n,0);}
  function change(id,delta){
    const v=inventory.find(x=>x.id===id);if(!v)return;
    const next=Math.max(0,Math.min(v.stock,(chosen.get(id)||0)+delta));
    if(delta>0 && totalStems()>=24)return;
    if(next===0)chosen.delete(id);else chosen.set(id,next);
    renderFlowers();renderSummary();
  }
  function renderSummary(){
    const count=totalStems();const finish=document.querySelector('input[name="finish"]:checked')?.value||'wrapped';
    const subtotal=[...chosen].reduce((sum,[id,qty])=>sum+qty*(inventory.find(x=>x.id===id)?.unit_price_cents||0),0)+(finish==='vase'?1000:0);
    el('stem-count').textContent=`${count} stem${count===1?'':'s'}`;
    el('subtotal').textContent=money(subtotal);
    const chosenNames=[...chosen].map(([id,n])=>{const x=inventory.find(v=>v.id===id);return x?`${n} × ${x.color} ${x.flower}`:null;}).filter(Boolean);
    const list=el('selected-list');list.replaceChildren();
    if(chosenNames.length){for(const line of chosenNames)list.append(node('span','',line));}
    else list.textContent='Choose at least 3 stems to get started.';
    const submit=el('bouquet-submit');submit.disabled=count<3||count>24;
    submit.firstChild.textContent=count<3?`Choose ${3-count} more stem${3-count===1?'':'s'} `:'Send my bouquet request ';
  }
  document.querySelectorAll('.mood').forEach(button=>button.addEventListener('click',()=>{
    palette=button.dataset.mood;
    document.querySelectorAll('.mood').forEach(x=>{x.classList.toggle('active',x===button);x.setAttribute('aria-pressed',String(x===button));});
  }));
  document.querySelectorAll('.finish-choice input').forEach(input=>input.addEventListener('change',()=>{
    document.querySelectorAll('.finish-choice').forEach(x=>x.classList.toggle('active',x.querySelector('input').checked));renderSummary();
  }));
  async function setupTurnstile(){
    let config;try{config=await api('/api/config');}catch{return;}
    if(!config.turnstileSiteKey)return;
    turnstileEnabled=true;
    const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;
    script.onload=()=>{
      for(const kind of ['bouquet','event']){
        turnstileIds[kind]=window.turnstile.render(document.querySelector(`[data-turnstile="${kind}"]`),{
          sitekey:config.turnstileSiteKey,theme:'light',callback:token=>{turnstileTokens[kind]=token;},
          'expired-callback':()=>{turnstileTokens[kind]='';},'error-callback':()=>{turnstileTokens[kind]='';}
        });
      }
    };
    document.head.append(script);
  }
  function showError(id,message){const error=el(id);error.textContent=message;error.hidden=false;}
  function resetTurnstile(kind){if(turnstileEnabled&&window.turnstile&&turnstileIds[kind]!=null){window.turnstile.reset(turnstileIds[kind]);turnstileTokens[kind]='';}}
  async function submitForm(formId,path,kind,extra,successId,errorId){
    const form=el(formId),error=el(errorId);error.hidden=true;
    if(!form.reportValidity())return;
    if(turnstileEnabled&&!turnstileTokens[kind]){showError(errorId,'Please complete the security check.');return;}
    const data=Object.fromEntries(new FormData(form));
    const body={...data,...extra,turnstileToken:turnstileTokens[kind]||''};
    const button=form.querySelector('button[type="submit"]');const original=button.innerHTML;
    button.disabled=true;button.textContent='Sending your request…';
    try{
      await api(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      form.hidden=true;el(successId).hidden=false;el(successId).scrollIntoView({behavior:'smooth',block:'center'});
      if(kind==='bouquet')await loadInventory();
    }catch(e){showError(errorId,e.message);resetTurnstile(kind);if(kind==='bouquet')await loadInventory();}
    finally{button.innerHTML=original;if(!form.hidden)button.disabled=kind==='bouquet'?totalStems()<3:false;}
  }
  el('event-form').addEventListener('submit',event=>{
    event.preventDefault();submitForm('event-form','/api/request-event','event',{},'event-success','event-error');
  });
  el('bouquet-form').addEventListener('submit',event=>{
    event.preventDefault();const count=totalStems();if(count<3||count>24)return;
    submitForm('bouquet-form','/api/request-bouquet','bouquet',{
      items:[...chosen].map(([id,quantity])=>({id,quantity})),palette,finish:document.querySelector('input[name="finish"]:checked').value
    },'bouquet-success','bouquet-error');
  });
  loadInventory();setupTurnstile();
  window.addEventListener('focus',()=>{if(!el('bouquet-form').hidden)loadInventory();});
})();
