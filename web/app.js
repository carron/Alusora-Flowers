(() => {
'use strict';
const $ = (selector) => document.querySelector(selector);
const state = {flowers:[], products:[], counts:{}, palette:'Blush & cream', finish:'wrapped'};
const CAD = cents => new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(cents/100);
const pad = n=>String(n).padStart(2,'0');
function torontoDate(days=0) {
  const parts = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const obj=Object.fromEntries(parts.map(p=>[p.type,p.value]));
  const d=new Date(Date.UTC(+obj.year,+obj.month-1,+obj.day+days));
  return [d.getUTCFullYear(),pad(d.getUTCMonth()+1),pad(d.getUTCDate())].join('-');
}
function feedback(id, message, type) {
  const node=$(id); node.textContent=message;node.className='feedback '+type;
}
function formData(form) {
  const data=Object.fromEntries(new FormData(form).entries());
  for(const key of ['guests','quantity']) { if(data[key]==='') delete data[key]; else if(key in data) data[key]=Number(data[key]); }
  return data;
}
async function submit(endpoint,body,form,feedbackId){
  const button=form.querySelector('button[type=submit]');
  button.disabled=true;button.textContent='Sending…';
  $(feedbackId).className='feedback';$(feedbackId).textContent='';
  try {
    const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    let result; try{result=await response.json();}catch{throw Error('The server returned an unexpected response. Please try again.');}
    if(!response.ok)throw Error(result.error||'We could not process your request.');
    if(result.notification_sent===true) {
      feedback(feedbackId,`Thank you! Your request has been sent successfully. Someone from ALUSORA will be in touch with you soon. Reference: ${result.quote_id}.`,'success');
      form.reset(); if(endpoint==='/api/custom-request') resetSelections();
    } else {
      feedback(feedbackId,`Your request was saved (reference ${result.quote_id}), but our email notification could not be sent. Please email arron.cursos@gmail.com with your reference so we can follow up.`,'warning');
    }
  } catch(error) {
    feedback(feedbackId,`We couldn't submit your request. ${error.message}`,'error');
  } finally {
    button.disabled=false;button.textContent='Send my request';
    setDateLimits();
  }
}
function setDateLimits(){
 const tomorrow=torontoDate(1);
 const delivery=$('#delivery-date');delivery.min=tomorrow;
 const max=torontoDate(400);delivery.max=max;
 if(delivery.value && (delivery.value<tomorrow||delivery.value>max))delivery.value='';
 const event=$('#event-date');event.min=torontoDate();event.max=torontoDate(730);
}
function updateSelection(){
 const stems=Object.entries(state.counts).filter(([,v])=>v>0);
 const count=stems.reduce((s,[,v])=>s+v,0);
 const raw=599+stems.reduce((s,[key,v])=>s+(state.flowers.find(f=>f.id===key)?.price||0)*v,0)+(state.finish==='vase'?1000:0);
 $('#custom-estimate').textContent=count?CAD(raw):'$0.00';
 $('#selected-summary').textContent=`${count} of 24 stems selected`+(count<3?' — minimum 3 stems':'');
 document.querySelectorAll('[data-counter]').forEach(el=>{el.textContent=state.counts[el.dataset.counter]||0;});
}
function resetSelections(){state.counts={};updateSelection();}
function renderFlowers(){
 const parent=$('#flower-choices');parent.replaceChildren();
 state.flowers.forEach(f=>{
   const div=document.createElement('div');div.className='flower-choice';
   const icon=document.createElement('div');icon.className='flower-icon';icon.textContent='✿';
   const info=document.createElement('div');info.className='flower-info';
   const strong=document.createElement('strong');strong.textContent=f.name;
   const small=document.createElement('small');small.textContent=`${CAD(f.price)} / stem • ${f.available} available`;info.append(strong,small);
   const counter=document.createElement('div');counter.className='counter';
   const minus=document.createElement('button');minus.type='button';minus.textContent='−';minus.setAttribute('aria-label',`Remove ${f.name}`);
   const output=document.createElement('output');output.dataset.counter=f.id;output.textContent='0';
   const plus=document.createElement('button');plus.type='button';plus.textContent='+';plus.setAttribute('aria-label',`Add ${f.name}`);
   minus.addEventListener('click',()=>{state.counts[f.id]=Math.max(0,(state.counts[f.id]||0)-1);updateSelection();});
   plus.addEventListener('click',()=>{
     const total=Object.values(state.counts).reduce((a,b)=>a+b,0);
     if(total>=24){feedback('#custom-feedback','The maximum is 24 stems per bouquet.','error');return;}
     if((state.counts[f.id]||0)>=Math.min(24,f.available)){feedback('#custom-feedback',`We cannot select more ${f.name} at the moment.`,'error');return;}
     state.counts[f.id]=(state.counts[f.id]||0)+1;updateSelection();
   });
   counter.append(minus,output,plus);div.append(icon,info,counter);parent.append(div);
 });
 updateSelection();
}
function renderCatalog(){
 const parent=$('#catalog');parent.replaceChildren();
 state.products.forEach((pr,i)=>{
   const article=document.createElement('article');article.className='product';
   const art=document.createElement('div');art.className='product-art';art.textContent='✿';
   const info=document.createElement('div');info.className='product-info';
   const tag=document.createElement('span');tag.className='tag';tag.textContent=pr.tag||pr.category;
   const name=document.createElement('h3');name.textContent=pr.name;
   const subtitle=document.createElement('p');subtitle.textContent=pr.subtitle;
   const price=document.createElement('strong');price.textContent=CAD(pr.price);
   info.append(tag,name,subtitle,price);article.append(art,info);parent.append(article);
 });
}
$('#palette').addEventListener('change',e=>state.palette=e.target.value);
$('#finish').addEventListener('change',e=>{state.finish=e.target.value;updateSelection();});
$('#custom-form').addEventListener('submit',async e=>{
 e.preventDefault();setDateLimits();
 const qty=Object.values(state.counts).reduce((a,b)=>a+b,0);
 if(qty<3||qty>24){feedback('#custom-feedback','Please select between 3 and 24 flower stems.','error');return;}
 const data=formData(e.currentTarget);
 if(!data.delivery_date || data.delivery_date<torontoDate(1)){feedback('#custom-feedback','Please choose a delivery date starting tomorrow. Same-day requests are not available.','error');return;}
 if(!e.currentTarget.reportValidity())return;
 data.palette=$('#palette').value;
 data.selection={stems:{...state.counts},palette:data.palette,finish:$('#finish').value,estimated_price_cad:CAD(599+Object.entries(state.counts).reduce((sum,[key,v])=>sum+(state.flowers.find(f=>f.id===key)?.price||0)*v,0)+($('#finish').value==='vase'?1000:0))};
 await submit('/api/custom-request',data,e.currentTarget,'#custom-feedback');
});
$('#event-form').addEventListener('submit',async e=>{
 e.preventDefault();if(!e.currentTarget.reportValidity())return;
 await submit('/api/events',formData(e.currentTarget),e.currentTarget,'#event-feedback');
});
async function init(){
 setDateLimits();
 try{
  const response=await fetch('/api/catalog');
  if(!response.ok)throw Error('Could not load flowers');
  const catalog=await response.json();
  state.flowers=catalog.flowers||[];state.products=catalog.products||[];
  renderFlowers();renderCatalog();
 }catch(error){
   $('#catalog').textContent='Our collection is temporarily unavailable. Please contact us for assistance.';
   $('#flower-choices').textContent='Flower options are temporarily unavailable.';
   $('#custom-form button[type=submit]').disabled=true;
 }
}
init();
})();