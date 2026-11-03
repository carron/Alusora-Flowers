(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const mk=(tag,content,cls)=>{const x=document.createElement(tag);if(content!=null)x.textContent=content;if(cls)x.className=cls;return x;};
  const money=cents=>(cents/100).toLocaleString('en-CA',{style:'currency',currency:'CAD'});
  async function api(path,opts={}){
    const r=await fetch(path,{credentials:'same-origin',...opts});let j={};try{j=await r.json();}catch{}
    if(!r.ok)throw new Error(j.error||'Request failed.');return j;
  }
  const post=(path,body)=>api(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  function showError(id,message){const x=$(id);x.textContent=message;x.hidden=!message;}
  function toast(message){$('staff-message').textContent=message;}
  async function showDashboard(){
    $('login-wrap').hidden=true;$('dashboard').hidden=false;
    try{await getInventory();}catch(e){toast(e.message);}
  }
  async function login(e){e.preventDefault();showError('login-error','');const btn=e.target.querySelector('button');btn.disabled=true;
    try{await post('/api/admin/login',{password:$('password').value});$('password').value='';await showDashboard();}
    catch(err){showError('login-error',err.message);}finally{btn.disabled=false;}
  }
  $('login-form').addEventListener('submit',login);
  $('logout').addEventListener('click',async()=>{await api('/api/admin/logout',{method:'POST'});$('dashboard').hidden=true;$('login-wrap').hidden=false;});
  document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{
    const kind=b.dataset.tab;document.querySelectorAll('[data-tab]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-selected',String(x===b));});
    $('inventory-panel').hidden=kind!=='inventory';$('requests-panel').hidden=kind!=='requests';
    if(kind==='requests')getRequests();
  }));
  function input(value,type='text',cls=''){const x=mk('input');x.type=type;x.value=value;x.className=cls;return x;}
  function cell(x){const td=mk('td');td.append(x);return td;}
  async function getInventory(){
    const {items}=await api('/api/admin/inventory');const root=$('inventory-table');root.replaceChildren();
    if(!items.length){root.append(cell(mk('span','No flowers yet. Use the form below.')));return;}
    for(const item of items){
      const tr=mk('tr');const flower=input(item.flower,'text','name-input'),color=input(item.color,'text','name-input'),price=input((item.unit_price_cents/100).toFixed(2),'number'),stock=input(item.stock,'number'),active=mk('input');
      active.type='checkbox';active.checked=!!item.active;price.step='.01';price.min='.01';stock.step='1';stock.min='0';
      const save=mk('button','Save');save.type='button';save.addEventListener('click',async()=>{
        save.disabled=true;toast('Saving…');try{
          const p=Math.round(Number(price.value)*100),s=Number(stock.value);
          if(!Number.isFinite(p)||!Number.isInteger(s))throw new Error('Please enter valid numeric values.');
          await post('/api/admin/inventory',{id:item.id,flower:flower.value.trim(),color:color.value.trim(),price:p,stock:s,active:active.checked});toast(`Saved ${flower.value} · ${color.value}.`);
        }catch(e){toast(e.message);}finally{save.disabled=false;}
      });
      tr.append(cell(flower),cell(color),cell(price),cell(stock),cell(active),cell(save));root.append(tr);
    }
  }
  $('add-form').addEventListener('submit',async e=>{
    e.preventDefault();const form=e.target,data=Object.fromEntries(new FormData(form));
    try{await post('/api/admin/inventory',{flower:data.flower,color:data.color,price:Math.round(Number(data.price)*100),stock:Number(data.stock),active:true});
      form.reset();toast('New flower colour added.');await getInventory();}catch(err){toast(err.message);}
  });
  $('refresh-requests').addEventListener('click',getRequests);
  async function getRequests(){
    const root=$('requests-list');root.textContent='Loading…';
    try{
      const {requests}=await api('/api/admin/requests');root.replaceChildren();
      if(!requests.length){root.append(mk('p','No requests yet.'));return;}
      for(const r of requests){
        const article=mk('article',null,'admin-item'),head=mk('div',null,'admin-item-header'),left=mk('div');
        left.append(mk('h3',r.package_name || 'Picked-by-you bouquet'),mk('p',`${r.created_at} • ${r.type.toUpperCase()} • ${r.status}`));
        const status=mk('select');for(const item of ['new','contacted','completed']){const opt=mk('option',item[0].toUpperCase()+item.slice(1));opt.value=item;opt.selected=r.status===item;status.append(opt);}
        status.disabled=r.status==='email_failed';status.addEventListener('change',async()=>{
          try{await post('/api/admin/requests/status',{id:r.id,status:status.value});toast('Request status updated.');}catch(e){toast(e.message);}
        });
        head.append(left,status);article.append(head);
        const parts=[`Customer: ${r.name}`,`Email: ${r.email}`,`Phone: ${r.phone||'—'}`,`Date: ${r.event_date}`,`Guests: ${r.guests??'—'}`,`Colours: ${r.palette||'—'}`];
        if(r.finish)parts.push(`Finish: ${r.finish}`);
        if(r.subtotal_cents!=null)parts.push(`Starting amount / estimate: ${money(r.subtotal_cents)} before tax`);
        if(r.items?.length)parts.push('Stems: '+r.items.map(x=>`${x.quantity} x ${x.color} ${x.flower}`).join('; '));
        if(r.notes)parts.push(`Notes: ${r.notes}`);
        const pre=mk('pre',parts.join('\n'));article.append(pre);
        const mail=mk('a','Reply by email ↗');mail.href=`mailto:${encodeURIComponent(r.email)}?subject=${encodeURIComponent('Your ALUSORA Flowers enquiry')}`;mail.style.color='#74374e';
        article.append(mail);root.append(article);
      }
    }catch(e){root.textContent=e.message;}
  }
  api('/api/admin/session').then(showDashboard).catch(()=>{});
})();
