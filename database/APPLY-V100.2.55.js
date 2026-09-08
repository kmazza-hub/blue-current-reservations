"use strict";
const fs=require("fs"),path=require("path");
const root=process.cwd();
const file=path.join(root,"client","js","floor-reservations-v62.0.js");
if(!fs.existsSync(file)) throw new Error("V100.2.55 requires client/js/floor-reservations-v62.0.js");
let s=fs.readFileSync(file,"utf8");
if(!s.includes("V100.2.52 — Service Milestones")) throw new Error("V100.2.55 requires the V100.2.52+ Service milestone baseline.");
if(!s.includes("V100.2.47 — Floor Layout Restoration")) throw new Error("V100.2.55 requires the repaired V100.2.53 floor baseline. Refusing to modify an unverified floor controller.");
if(s.includes("V100.2.55 — Service First Priority")){console.log(JSON.stringify({ok:true,version:"100.2.55",status:"already-applied"},null,2));process.exit(0);}

// Compatibility: carry forward V100.2.54 priority/pacing if its earlier apply guard prevented it from landing.
if(!s.includes("V100.2.54 — Service Priority & Pacing")){
  const oldFn=' function serviceNeedsAttention(p){return (p?.status||"seated")==="seated"&&Math.max(0,Date.now()-Number(p?.seatedAt||Date.now()))>=3*60000;}';
  const newFn=` // V100.2.54 — Service Priority & Pacing. Surgical service-only change; floor renderer untouched.\n const SERVICE_PACE_MINUTES={seated:3,greeted:7,ordering:15,dining:45,check:10};\n function serviceStageAgeMs(p){const status=p?.status||"seated";const anchor=status==="seated"?Number(p?.seatedAt||Date.now()):Number(p?.updatedAt||p?.seatedAt||Date.now());return Math.max(0,Date.now()-anchor);}\n function serviceNeedsAttention(p){const status=p?.status||"seated",limit=SERVICE_PACE_MINUTES[status];return Number.isFinite(limit)&&serviceStageAgeMs(p)>=limit*60000;}\n function serviceAttentionLabel(p){if(!serviceNeedsAttention(p))return "";const status=p?.status||"seated";return status==="seated"?"Needs greeting":"Needs attention";}\n function servicePriorityScore(p){if(!serviceNeedsAttention(p))return 0;const status=p?.status||"seated",limit=(SERVICE_PACE_MINUTES[status]||999)*60000;return 1000+Math.floor(serviceStageAgeMs(p)/Math.max(1,limit));}`;
  if(!s.includes(oldFn)) throw new Error("V100.2.55 compatibility guard failed: expected Service attention function not found. No files changed.");
  s=s.replace(oldFn,newFn);
}

const oldRows='   const rows=readServiceParties().filter(p=>p&&p.status!=="cleared");';
const priorityRows='   const rows=readServiceParties().filter(p=>p&&p.status!=="cleared").sort((a,b)=>servicePriorityScore(b)-servicePriorityScore(a)||Number(a.seatedAt||0)-Number(b.seatedAt||0));';
if(s.includes(oldRows)) s=s.replace(oldRows,priorityRows);
if(!s.includes(priorityRows)) throw new Error("V100.2.55 guard failed: Service rows are not on the priority baseline.");

const oldSummary='   summary.innerHTML=`<div><span>Active tables</span><strong>${rows.length}</strong></div><div><span>Active covers</span><strong>${covers}</strong></div><div><span>Needs greeting</span><strong>${needs}</strong></div>`;';
const prioritySummary='   summary.innerHTML=`<div><span>Active tables</span><strong>${rows.length}</strong></div><div><span>Active covers</span><strong>${covers}</strong></div><div><span>Needs attention</span><strong>${needs}</strong></div>`;';
if(s.includes(oldSummary)) s=s.replace(oldSummary,prioritySummary);
if(!s.includes(prioritySummary)) throw new Error("V100.2.55 guard failed: Service summary baseline not found.");

const oldMap='list.innerHTML=rows.length?rows.map((p,i)=>{const stage=serviceStage(p),attention=serviceNeedsAttention(p);return `<article class="bc-service-party-v251" data-service-row="${i}" data-needs-attention="${attention}"><div><strong>${escapeHtml(p.guest||"Guest")}</strong><small>${escapeHtml(p.guestDetail||`Party of ${p.partySize||"—"}`)}</small></div><div class="meta"><span>Table</span><b>${escapeHtml(serviceTableLabel(p))}</b></div><div class="meta"><span>Service</span><b class="bc-service-stage-v252">${escapeHtml(stage.label)}</b><small>Seated ${escapeHtml(serviceElapsed(p.seatedAt))}</small></div><button type="button" data-service-action="advance" data-final="${stage.next==="complete"}">${escapeHtml(stage.action)}</button></article>`;}).join("")';
const priorityMap='list.innerHTML=rows.length?rows.map((p,i)=>{const stage=serviceStage(p),attention=serviceNeedsAttention(p),attentionLabel=serviceAttentionLabel(p);return `<article class="bc-service-party-v251" data-service-row="${i}" data-needs-attention="${attention}"><div><strong>${escapeHtml(p.guest||"Guest")}</strong><small>${escapeHtml(p.guestDetail||`Party of ${p.partySize||"—"}`)}</small>${attentionLabel?`<small><b>${escapeHtml(attentionLabel)}</b></small>`:""}</div><div class="meta"><span>Table</span><b>${escapeHtml(serviceTableLabel(p))}</b></div><div class="meta"><span>Service</span><b class="bc-service-stage-v252">${escapeHtml(stage.label)}</b><small>Seated ${escapeHtml(serviceElapsed(p.seatedAt))}</small></div><button type="button" data-service-action="advance" data-final="${stage.next==="complete"}">${escapeHtml(stage.action)}</button></article>`;}).join("")';
if(s.includes(oldMap)) s=s.replace(oldMap,priorityMap);
if(!s.includes(priorityMap)) throw new Error("V100.2.55 guard failed: Service row renderer baseline not found.");

// V100.2.55 — Service First Priority
const cssNeedle='.bc-service-list-v251{overflow:auto;padding:0 30px 30px;display:grid;gap:12px}';
const cssInsert='.bc-service-focus-v255{margin:0 30px 18px;border:1px solid rgba(117,210,218,.34);background:#0a2d37;border-radius:18px;padding:15px 18px;display:flex;align-items:center;justify-content:space-between;gap:18px}.bc-service-focus-v255 small{display:block;color:#8ed8e3;font-size:11px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.bc-service-focus-v255 strong{display:block;font-size:20px;margin-top:3px}.bc-service-focus-v255 span{color:#c9e4e8;font-size:14px;font-weight:700;text-align:right}.bc-service-focus-v255[data-urgent="true"]{border-color:#f3c965;box-shadow:inset 4px 0 0 #f3c965}.bc-service-list-v251{overflow:auto;padding:0 30px 30px;display:grid;gap:12px}';
if(!s.includes(cssNeedle)) throw new Error("V100.2.55 guard failed: Service list CSS anchor not found.");
s=s.replace(cssNeedle,cssInsert);

const shellNeedle='</header><div class="bc-service-summary-v251"></div><div class="bc-service-list-v251"></div></div>`;';
const shellInsert='</header><div class="bc-service-summary-v251"></div><div class="bc-service-focus-v255" aria-live="polite"></div><div class="bc-service-list-v251"></div></div>`;';
if(!s.includes(shellNeedle)) throw new Error("V100.2.55 guard failed: Service shell anchor not found.");
s=s.replace(shellNeedle,shellInsert);

const varsNeedle='   const summary=overlay.querySelector(".bc-service-summary-v251"),list=overlay.querySelector(".bc-service-list-v251");\n   summary.innerHTML=';
const varsInsert='   // V100.2.55 — Service First Priority\n   const summary=overlay.querySelector(".bc-service-summary-v251"),focus=overlay.querySelector(".bc-service-focus-v255"),list=overlay.querySelector(".bc-service-list-v251");\n   const first=rows[0]||null,firstStage=first?serviceStage(first):null,firstUrgent=!!(first&&serviceNeedsAttention(first));\n   if(focus){focus.dataset.urgent=String(firstUrgent);focus.innerHTML=first?`<div><small>First priority</small><strong>${escapeHtml(firstUrgent?(serviceAttentionLabel(first)||"Needs attention"):"Service on pace")}</strong></div><span>${escapeHtml(first.guest||"Guest")} · ${escapeHtml(serviceTableLabel(first))} · ${escapeHtml(firstStage?.action||"Continue service")}</span>`:`<div><small>First priority</small><strong>No active tables</strong></div><span>Service is clear.</span>`;}\n   summary.innerHTML=';
if(!s.includes(varsNeedle)) throw new Error("V100.2.55 guard failed: Service render variable anchor not found.");
s=s.replace(varsNeedle,varsInsert);

fs.copyFileSync(file,file+".v100.2.55.bak");
fs.writeFileSync(file,s);
const testSrc=path.join(__dirname,"scripts","maintenance","test-v100.2.55-service-first-priority.js"),testDst=path.join(root,"scripts","maintenance","test-v100.2.55-service-first-priority.js");
fs.mkdirSync(path.dirname(testDst),{recursive:true});fs.copyFileSync(testSrc,testDst);
console.log(JSON.stringify({ok:true,version:"100.2.55",wave:"Service First Priority",compatibility:"carries V100.2.54 pacing forward when needed",architecture:"guarded service-only patch",floorRenderer:"untouched"},null,2));
