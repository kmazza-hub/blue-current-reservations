(() => {
"use strict";
// V100.2.60 — Kitchen Truth Foundation.
// Kitchen shows only facts Blue Current currently owns. No synthetic station load,
// ticket time, item, or POS/KDS claim is created without a real kitchen source.
const SERVICE_KEY="blueCurrent.service.activeParties.v100";
const READY_KEY="blueCurrent.kitchen.truth.ready.v100.2.60";
const byId=id=>document.getElementById(id);
const readJSON=(key,fallback)=>{try{const x=JSON.parse(localStorage.getItem(key)||"null");return x??fallback;}catch{return fallback;}};
const writeJSON=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}};
const guestKey=value=>String(value||"").trim().toLowerCase().replace(/\s+/g," ");
const partyKey=p=>`${guestKey(p?.guest)}|${Number(p?.partySize||0)}|${String(p?.tableId||p?.table||"")}`;
const active=()=>{const x=window.BlueCurrentServiceHandoff?.getActive?.()||readJSON(SERVICE_KEY,[]);return Array.isArray(x)?x:[];};
const readyMap=()=>{const x=readJSON(READY_KEY,{});return x&&typeof x==="object"&&!Array.isArray(x)?x:{};};
const stageAge=p=>Math.max(0,Math.floor((Date.now()-Number(p?.updatedAt||p?.seatedAt||Date.now()))/60000));
const escapeHTML=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
let observer=null,rendering=false;

function ensureStyles(){
 if(byId("bcKitchenTruthStylesV100260"))return;
 const style=document.createElement("style");style.id="bcKitchenTruthStylesV100260";
 style.textContent=`
 #kitchenThroughputCenter.bc-kitchen-truth-v260{display:block!important;padding:26px;border-radius:24px;background:#071d25;color:#f7fbfc}
 .bc-kitchen-truth-v260 .bc-kt-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;margin-bottom:20px}
 .bc-kitchen-truth-v260 .bc-kt-head small{display:block;letter-spacing:.12em;text-transform:uppercase;opacity:.7;font-weight:800}
 .bc-kitchen-truth-v260 .bc-kt-head strong{display:block;font-size:28px;margin-top:5px}
 .bc-kitchen-truth-v260 .bc-kt-head p{margin:7px 0 0;color:#c7d8dd;max-width:720px}
 .bc-kitchen-truth-v260 .bc-kt-badge{white-space:nowrap;border:1px solid #34515a;border-radius:999px;padding:8px 12px;font-weight:800}
 .bc-kitchen-truth-v260 .bc-kt-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:18px 0}
 .bc-kitchen-truth-v260 .bc-kt-summary article{background:#0d2a34;border:1px solid #23434d;border-radius:18px;padding:15px}
 .bc-kitchen-truth-v260 .bc-kt-summary span{display:block;color:#b8cbd1;font-size:13px}.bc-kitchen-truth-v260 .bc-kt-summary strong{display:block;font-size:28px;margin-top:4px}
 .bc-kitchen-truth-v260 .bc-kt-list{display:grid;gap:10px}.bc-kitchen-truth-v260 .bc-kt-row{display:grid;grid-template-columns:1.2fr .8fr auto;gap:14px;align-items:center;background:#fff;color:#102a33;border-radius:17px;padding:15px 16px}
 .bc-kitchen-truth-v260 .bc-kt-row small{display:block;color:#60747b}.bc-kitchen-truth-v260 .bc-kt-row strong{font-size:18px}
 .bc-kitchen-truth-v260 .bc-kt-row button{border:0;border-radius:12px;padding:11px 14px;background:#0b6675;color:#fff;font-weight:800;cursor:pointer}
 .bc-kitchen-truth-v260 .bc-kt-row button[disabled]{background:#dbe7ea;color:#46606a;cursor:default}
 .bc-kitchen-truth-v260 .bc-kt-empty{background:#0d2a34;border:1px solid #23434d;border-radius:18px;padding:24px;color:#d7e4e8}
 .bc-kitchen-truth-v260 .bc-kt-source{margin-top:16px;padding-top:14px;border-top:1px solid #23434d;color:#9fb7be;font-size:13px}
 @media(max-width:760px){.bc-kitchen-truth-v260 .bc-kt-head{display:block}.bc-kitchen-truth-v260 .bc-kt-badge{display:inline-block;margin-top:12px}.bc-kitchen-truth-v260 .bc-kt-summary{grid-template-columns:1fr}.bc-kitchen-truth-v260 .bc-kt-row{grid-template-columns:1fr}.bc-kitchen-truth-v260 .bc-kt-row button{width:100%}}
 `;document.head.appendChild(style);
}
function rows(){
 const readiness=readyMap();
 return active().filter(p=>p.status==="ordering").map(p=>({...p,key:partyKey(p),age:stageAge(p),ready:Boolean(readiness[partyKey(p)])}))
   .sort((a,b)=>Number(b.ready)-Number(a.ready)||b.age-a.age);
}
function markReady(key){
 const map=readyMap();map[key]={readyAt:Date.now()};writeJSON(READY_KEY,map);
 window.dispatchEvent(new CustomEvent("bc:kitchen-order-ready",{detail:{partyKey:key,readyAt:map[key].readyAt}}));render();
}
function prune(){
 const valid=new Set(active().filter(p=>p.status==="ordering").map(partyKey)),map=readyMap();let changed=false;
 Object.keys(map).forEach(key=>{if(!valid.has(key)){delete map[key];changed=true;}});
 if(changed)writeJSON(READY_KEY,map);
}
function render(){
 const root=byId("kitchenThroughputCenter");if(!root||rendering)return;
 rendering=true;prune();ensureStyles();root.classList.add("bc-kitchen-truth-v260");root.dataset.bcKitchenTruth="100.2.60";
 const all=active(),orders=rows(),ready=orders.filter(x=>x.ready).length,attention=orders.filter(x=>!x.ready&&x.age>=15).length;
 root.innerHTML=`<div class="bc-kt-head"><div><small>Kitchen · live</small><strong>Orders that need kitchen attention</strong><p>Blue Current is showing only service-owned facts. Ticket items, station load, and cook times stay hidden until a real POS/KDS source is connected.</p></div><span class="bc-kt-badge">Service-linked</span></div>
 <div class="bc-kt-summary"><article><span>Orders in progress</span><strong>${orders.length}</strong></article><article><span>Ready to run</span><strong>${ready}</strong></article><article><span>15+ min without ready</span><strong>${attention}</strong></article></div>
 <div class="bc-kt-list">${orders.length?orders.map(p=>`<article class="bc-kt-row"><div><small>${escapeHTML(p.tableId||p.table||"Assigned table")}</small><strong>${escapeHTML(p.guest||"Guest")}</strong></div><div><small>Service state</small><strong>${p.ready?"Ready to run":`Ordering · ${p.age}m`}</strong></div><button type="button" data-bc-kitchen-ready="${escapeHTML(p.key)}" ${p.ready?"disabled":""}>${p.ready?"Ready":"Mark ready"}</button></article>`).join(""):`<div class="bc-kt-empty"><strong>No active kitchen handoffs.</strong><div>Tables appear here when Service reaches Ordering.</div></div>`}</div>
 <div class="bc-kt-source">Source: Blue Current Service lifecycle · ${all.length} active service ${all.length===1?"table":"tables"} · No synthetic kitchen metrics</div>`;
 root.querySelectorAll("[data-bc-kitchen-ready]").forEach(button=>button.addEventListener("click",()=>markReady(button.dataset.bcKitchenReady)));
 rendering=false;
}
function init(){
 const root=byId("kitchenThroughputCenter");if(!root)return;
 render();
 observer=new MutationObserver(()=>{if(!rendering&&root.dataset.bcKitchenTruth!=="100.2.60")render();});
 observer.observe(root,{childList:true,subtree:false});
 ["bc:service-party-received","bc:service-party-updated","bc:service-party-completed","bc:service-stale-pruned"].forEach(name=>window.addEventListener(name,render));
 window.addEventListener("storage",e=>{if(e.key===SERVICE_KEY)render();});
 setInterval(render,60000);
 window.BlueCurrentKitchenTruthV100_2_60={render,getOrders:()=>rows().map(x=>({...x}))};
}
document.readyState==="loading"?document.addEventListener("DOMContentLoaded",init,{once:true}):init();
})();
