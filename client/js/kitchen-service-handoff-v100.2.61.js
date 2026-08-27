(() => {
"use strict";
// V100.2.61 — Kitchen Ready → Service / Expo Handoff.
// This bridge promotes a real Kitchen "Ready" signal inside the existing Service
// workspace. It adds no second service queue and does not alter Floor state.
const SERVICE_KEY="blueCurrent.service.activeParties.v100";
const READY_KEY="blueCurrent.kitchen.truth.ready.v100.2.60";
const byId=id=>document.getElementById(id);
const readJSON=(key,fallback)=>{try{const x=JSON.parse(localStorage.getItem(key)||"null");return x??fallback;}catch{return fallback;}};
const writeJSON=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}};
const guestKey=value=>String(value||"").trim().toLowerCase().replace(/\s+/g," ");
const partyKey=p=>`${guestKey(p?.guest)}|${Number(p?.partySize||0)}|${String(p?.tableId||p?.table||"")}`;
let decorating=false,settling=false;

function active(){
 const rows=window.BlueCurrentServiceHandoff?.getActive?.()||readJSON(SERVICE_KEY,[]);
 return Array.isArray(rows)?rows:[];
}
function readyMap(){
 const x=readJSON(READY_KEY,{});
 return x&&typeof x==="object"&&!Array.isArray(x)?x:{};
}
function readyRows(){
 const map=readyMap();
 return active().filter(p=>p?.status==="ordering"&&map[partyKey(p)])
   .map(p=>({...p,_bcReadyAt:Number(map[partyKey(p)]?.readyAt||p?.kitchenReadyAt||Date.now())}))
   .sort((a,b)=>a._bcReadyAt-b._bcReadyAt);
}
function ensureStyles(){
 if(byId("bcKitchenServiceHandoffStylesV100261"))return;
 const s=document.createElement("style");s.id="bcKitchenServiceHandoffStylesV100261";
 s.textContent=`
 .bc-service-party-v251[data-kitchen-ready="true"]{border-color:#80d7c6!important;box-shadow:inset 4px 0 0 #80d7c6!important}
 .bc-kitchen-ready-v261{display:inline-flex!important;align-items:center;gap:6px;width:max-content;margin-top:7px!important;padding:5px 8px;border-radius:999px;background:#dff6ef;color:#0a594d!important;font-size:11px!important;font-weight:900!important;letter-spacing:.08em;text-transform:uppercase}
 .bc-service-focus-v255[data-kitchen-ready="true"]{border-color:#80d7c6!important;box-shadow:inset 4px 0 0 #80d7c6!important}
 `;
 document.head.appendChild(s);
}
function rowForParty(root,party){
 const table=String(party?.tableId||party?.table||"").trim(),guest=String(party?.guest||"").trim();
 return Array.from(root.querySelectorAll(".bc-service-party-v251")).find(row=>{
   const tableText=row.querySelector(".meta b")?.textContent?.trim()||"";
   const guestText=row.querySelector("strong")?.textContent?.trim()||"";
   return tableText===table&&guestText===guest;
 })||null;
}
function decorate(){
 if(decorating)return;
 const overlay=byId("bcServiceWorkspaceV100251");
 if(!overlay)return;
 decorating=true;ensureStyles();
 overlay.querySelectorAll(".bc-service-party-v251").forEach(row=>{
   row.dataset.kitchenReady="false";
   row.querySelector(".bc-kitchen-ready-v261")?.remove();
 });
 const ready=readyRows();
 ready.forEach(p=>{
   const row=rowForParty(overlay,p);if(!row)return;
   row.dataset.kitchenReady="true";
   const badge=document.createElement("small");badge.className="bc-kitchen-ready-v261";badge.textContent="Food ready · run now";
   row.querySelector("div")?.appendChild(badge);
 });
 const focus=overlay.querySelector(".bc-service-focus-v255");
 if(focus){
   const first=ready[0]||null;
   focus.dataset.kitchenReady=String(Boolean(first));
   if(first){
     const table=String(first.tableId||first.table||"Assigned table"),guest=String(first.guest||"Guest");
     focus.dataset.urgent="true";
     focus.dataset.recovery="false";
     focus.innerHTML=`<div><small>First priority</small><strong>Food ready</strong></div><span>${escapeHtml(guest)} · ${escapeHtml(table)} · Run this table now, then mark Food delivered.</span>`;
   }
 }
 decorating=false;
}
function escapeHtml(value){
 return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}
function persistReadyToService(key,readyAt){
 const api=window.BlueCurrentServiceHandoff;if(!api?.update)return;
 const row=active().find(p=>partyKey(p)===key&&p.status==="ordering");
 if(!row)return;
 api.update(key,{kitchenReadyAt:Number(readyAt||Date.now())});
}
function settleDelivered(){
 if(settling)return;
 settling=true;
 const map=readyMap(),rows=active();let mapChanged=false;
 for(const row of rows){
   const key=partyKey(row);
   if(row.status!=="ordering"&&map[key]){
     delete map[key];mapChanged=true;
     if(row.kitchenReadyAt&&window.BlueCurrentServiceHandoff?.update){
       window.BlueCurrentServiceHandoff.update(key,{kitchenReadyAt:null,kitchenDeliveredAt:Date.now()});
     }
   }
 }
 // Remove orphaned ready signals when a Service party completed or disappeared.
 const live=new Set(rows.filter(p=>p.status==="ordering").map(partyKey));
 Object.keys(map).forEach(key=>{if(!live.has(key)){delete map[key];mapChanged=true;}});
 if(mapChanged)writeJSON(READY_KEY,map);
 settling=false;decorate();
}
function init(){
 ensureStyles();
 window.addEventListener("bc:kitchen-order-ready",event=>{
   const detail=event.detail||{};
   if(detail.partyKey)persistReadyToService(String(detail.partyKey),detail.readyAt);
   queueMicrotask(decorate);
 });
 window.addEventListener("bc:service-party-updated",()=>{queueMicrotask(settleDelivered);});
 window.addEventListener("bc:service-party-received",()=>{queueMicrotask(decorate);});
 window.addEventListener("bc:service-party-completed",()=>{queueMicrotask(settleDelivered);});
 const observer=new MutationObserver(()=>{if(!decorating)queueMicrotask(decorate);});
 const watch=()=>{
   const overlay=byId("bcServiceWorkspaceV100251");
   if(overlay){observer.observe(overlay,{childList:true,subtree:true});decorate();}
   else setTimeout(watch,100);
 };
 watch();
 window.BlueCurrentKitchenServiceHandoffV100_2_61={decorate,readyRows:()=>readyRows().map(x=>({...x})),settleDelivered};
}
document.readyState==="loading"?document.addEventListener("DOMContentLoaded",init,{once:true}):init();
})();