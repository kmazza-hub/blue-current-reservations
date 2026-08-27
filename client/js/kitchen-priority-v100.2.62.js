(() => {
"use strict";
// V100.2.62 — Kitchen First Priority / Exception Intelligence.
// Uses only Service handoff age + authoritative Kitchen Ready state.
// It never diagnoses the reason an order has not been marked Ready.
const SERVICE_KEY="blueCurrent.service.activeParties.v100";
const READY_KEY="blueCurrent.kitchen.truth.ready.v100.2.60";
const ATTENTION_MINUTES=15;
const RECOVERY_MINUTES=23; // restrained 1.5x escalation from the 15-minute handoff threshold
const byId=id=>document.getElementById(id);
const readJSON=(key,fallback)=>{try{const value=JSON.parse(localStorage.getItem(key)||"null");return value??fallback;}catch{return fallback;}};
const guestKey=value=>String(value||"").trim().toLowerCase().replace(/\s+/g," ");
const partyKey=p=>`${guestKey(p?.guest)}|${Number(p?.partySize||0)}|${String(p?.tableId||p?.table||"")}`;
const escapeHTML=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
let decorating=false,observer=null;

function active(){
 const rows=window.BlueCurrentServiceHandoff?.getActive?.()||readJSON(SERVICE_KEY,[]);
 return Array.isArray(rows)?rows:[];
}
function readiness(){
 const value=readJSON(READY_KEY,{});
 return value&&typeof value==="object"&&!Array.isArray(value)?value:{};
}
function ageMinutes(p){
 return Math.max(0,Math.floor((Date.now()-Number(p?.updatedAt||p?.seatedAt||Date.now()))/60000));
}
function kitchenRows(){
 const ready=readiness();
 return active().filter(p=>p?.status==="ordering").map(p=>{
   const key=partyKey(p),age=ageMinutes(p),readyAt=Number(ready[key]?.readyAt||p?.kitchenReadyAt||0);
   const isReady=Boolean(ready[key]);
   const level=isReady?"ready":age>=RECOVERY_MINUTES?"recovery":age>=ATTENTION_MINUTES?"attention":"pace";
   return {...p,key,age,ready:isReady,readyAt,level};
 }).sort((a,b)=>{
   const rank={ready:0,recovery:1,attention:2,pace:3};
   return rank[a.level]-rank[b.level] ||
     (a.level==="ready" ? a.readyAt-b.readyAt : b.age-a.age);
 });
}
function ensureStyles(){
 if(byId("bcKitchenPriorityStylesV100262"))return;
 const style=document.createElement("style");style.id="bcKitchenPriorityStylesV100262";
 style.textContent=`
 .bc-kitchen-priority-v262{margin:0 0 16px;padding:15px 17px;border:1px solid #31515b;border-radius:17px;background:#0d2a34;display:flex;justify-content:space-between;align-items:center;gap:18px}
 .bc-kitchen-priority-v262 small{display:block;color:#9fb7be;font-size:11px;font-weight:900;letter-spacing:.11em;text-transform:uppercase}
 .bc-kitchen-priority-v262 strong{display:block;font-size:20px;margin-top:3px}
 .bc-kitchen-priority-v262 span{color:#c7d8dd;font-size:14px;text-align:right}
 .bc-kitchen-priority-v262[data-tone="ready"]{border-color:#80d7c6;box-shadow:inset 4px 0 0 #80d7c6}
 .bc-kitchen-priority-v262[data-tone="attention"]{border-color:#f3c965;box-shadow:inset 4px 0 0 #f3c965}
 .bc-kitchen-priority-v262[data-tone="recovery"]{border-color:#ffad7a;box-shadow:inset 4px 0 0 #ffad7a}
 .bc-kt-row[data-kitchen-tone="attention"]{outline:2px solid #f3c965;outline-offset:-2px}
 .bc-kt-row[data-kitchen-tone="recovery"]{outline:2px solid #ffad7a;outline-offset:-2px}
 .bc-kt-row[data-kitchen-tone="ready"]{outline:2px solid #80d7c6;outline-offset:-2px}
 .bc-kitchen-exception-v262{display:inline-flex!important;width:max-content;margin-top:6px!important;padding:4px 7px;border-radius:999px;font-size:10px!important;font-weight:900!important;letter-spacing:.08em;text-transform:uppercase}
 .bc-kitchen-exception-v262[data-tone="attention"]{background:#fff3c8;color:#705600!important}
 .bc-kitchen-exception-v262[data-tone="recovery"]{background:#ffe2d2;color:#7a3213!important}
 .bc-kitchen-exception-v262[data-tone="ready"]{background:#dff6ef;color:#0a594d!important}
 @media(max-width:760px){.bc-kitchen-priority-v262{display:block}.bc-kitchen-priority-v262 span{display:block;text-align:left;margin-top:8px}}
 `;
 document.head.appendChild(style);
}
function rowFor(root,party){
 const table=String(party?.tableId||party?.table||"Assigned table").trim();
 const guest=String(party?.guest||"Guest").trim();
 return Array.from(root.querySelectorAll(".bc-kt-row")).find(row=>{
   const strong=row.querySelector("strong")?.textContent?.trim()||"";
   const small=row.querySelector("small")?.textContent?.trim()||"";
   return strong===guest&&small===table;
 })||null;
}
function priorityCopy(p){
 if(!p)return {tone:"clear",title:"Kitchen is clear",detail:"No active Service→Kitchen handoffs."};
 const table=String(p.tableId||p.table||"Assigned table"),guest=String(p.guest||"Guest");
 if(p.level==="ready")return {tone:"ready",title:"Run ready food",detail:`${guest} · ${table} · Ready is confirmed. Run this table now.`};
 if(p.level==="recovery")return {tone:"recovery",title:"Recovery needed",detail:`${guest} · ${table} · ${p.age}m in Ordering without a Ready confirmation. Check progress now.`};
 if(p.level==="attention")return {tone:"attention",title:"Needs a kitchen check",detail:`${guest} · ${table} · ${p.age}m in Ordering without a Ready confirmation.`};
 return {tone:"pace",title:"Kitchen handoffs on pace",detail:`${guest} · ${table} is the oldest active handoff at ${p.age}m.`};
}
function decorate(){
 if(decorating)return;
 const root=byId("kitchenThroughputCenter");
 if(!root||root.dataset.bcKitchenTruth!=="100.2.60")return;
 decorating=true;ensureStyles();
 root.querySelector(".bc-kitchen-priority-v262")?.remove();
 root.querySelectorAll(".bc-kt-row").forEach(row=>{
   delete row.dataset.kitchenTone;
   row.querySelector(".bc-kitchen-exception-v262")?.remove();
 });
 const rows=kitchenRows(),first=rows[0]||null,copy=priorityCopy(first);
 const priority=document.createElement("div");
 priority.className="bc-kitchen-priority-v262";
 priority.dataset.tone=copy.tone;
 priority.innerHTML=`<div><small>First priority</small><strong>${escapeHTML(copy.title)}</strong></div><span>${escapeHTML(copy.detail)}</span>`;
 root.querySelector(".bc-kt-summary")?.insertAdjacentElement("beforebegin",priority);
 rows.forEach(p=>{
   const row=rowFor(root,p);if(!row)return;
   row.dataset.kitchenTone=p.level;
   if(p.level==="pace")return;
   const badge=document.createElement("small");badge.className="bc-kitchen-exception-v262";badge.dataset.tone=p.level;
   badge.textContent=p.level==="ready"?"Ready · run now":p.level==="recovery"?"Recovery needed":"Needs check";
   row.querySelector("div")?.appendChild(badge);
 });
 decorating=false;
}
function init(){
 ensureStyles();
 const attach=()=>{
   const root=byId("kitchenThroughputCenter");
   if(!root){setTimeout(attach,100);return;}
   observer=new MutationObserver(()=>{if(!decorating)queueMicrotask(decorate);});
   observer.observe(root,{childList:true,subtree:true});
   decorate();
 };
 attach();
 ["bc:kitchen-order-ready","bc:service-party-updated","bc:service-party-received","bc:service-party-completed"].forEach(name=>window.addEventListener(name,()=>queueMicrotask(decorate)));
 setInterval(decorate,60000);
 window.BlueCurrentKitchenPriorityV100_2_62={decorate,getPriority:()=>kitchenRows()[0]||null,getRows:()=>kitchenRows().map(x=>({...x})),thresholds:{attention:ATTENTION_MINUTES,recovery:RECOVERY_MINUTES}};
}
document.readyState==="loading"?document.addEventListener("DOMContentLoaded",init,{once:true}):init();
})();