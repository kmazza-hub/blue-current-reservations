"use strict";
const fs=require("fs"),path=require("path");
const root=process.cwd();
const file=path.join(root,"client","js","floor-reservations-v62.0.js");
if(!fs.existsSync(file)) throw new Error("V100.2.56 requires client/js/floor-reservations-v62.0.js");
let s=fs.readFileSync(file,"utf8");
if(!s.includes("V100.2.55 — Service First Priority")) throw new Error("V100.2.56 requires the V100.2.55 Service First Priority baseline.");
if(!s.includes("V100.2.47 — Floor Layout Restoration")) throw new Error("V100.2.56 requires the protected floor restoration baseline. Refusing to modify an unverified controller.");
if(s.includes("V100.2.56 — Service Exception / Recovery Intelligence")){console.log(JSON.stringify({ok:true,version:"100.2.56",status:"already-applied"},null,2));process.exit(0);}

const floorMarker="// V100.2.47 — Floor Layout Restoration";
const floorIndex=s.indexOf(floorMarker);
if(floorIndex<0) throw new Error("V100.2.56 floor-protection marker missing.");
const protectedFloor=s.slice(floorIndex);

const fnNeedle=' function servicePriorityScore(p){if(!serviceNeedsAttention(p))return 0;const status=p?.status||"seated",limit=(SERVICE_PACE_MINUTES[status]||999)*60000;return 1000+Math.floor(serviceStageAgeMs(p)/Math.max(1,limit));}\n function renderServiceWorkspace(){';
const fnInsert=` function servicePriorityScore(p){if(!serviceNeedsAttention(p))return 0;const status=p?.status||"seated",limit=(SERVICE_PACE_MINUTES[status]||999)*60000;return 1000+Math.floor(serviceStageAgeMs(p)/Math.max(1,limit));}\n // V100.2.56 — Service Exception / Recovery Intelligence. Uses only known stage age; never invents a cause.\n const SERVICE_RECOVERY_MULTIPLIER=1.5;\n const SERVICE_RECOVERY_GUIDANCE={\n   seated:{reason:"Still waiting for a greeting",action:"Greet this table now"},\n   greeted:{reason:"Greeting is complete but ordering has not started",action:"Start the order now"},\n   ordering:{reason:"Ordering is still open",action:"Check order progress and move service forward"},\n   dining:{reason:"Dining has exceeded the expected pace",action:"Check the table and confirm the next need"},\n   check:{reason:"The check has been down longer than expected",action:"Close out the table when payment is complete"}\n };\n function serviceRecoveryException(p){const status=p?.status||"seated",limit=SERVICE_PACE_MINUTES[status],guide=SERVICE_RECOVERY_GUIDANCE[status];if(!Number.isFinite(limit)||!guide)return null;const ageMs=serviceStageAgeMs(p),recoveryAt=limit*SERVICE_RECOVERY_MULTIPLIER*60000;if(ageMs<recoveryAt)return null;return{status,minutes:Math.max(1,Math.floor(ageMs/60000)),reason:guide.reason,action:guide.action};}\n function serviceRecoveryReason(p){const x=serviceRecoveryException(p);return x?\`4{x.reason} · 4{x.minutes}m in this stage\`:"";}\n function renderServiceWorkspace(){`;
if(!s.includes(fnNeedle)) throw new Error("V100.2.56 guard failed: Service priority function anchor not found. No files changed.");
s=s.replace(fnNeedle,fnInsert);

const cssNeedle='.bc-service-focus-v255[data-urgent="true"]{border-color:#f3c965;box-shadow:inset 4px 0 0 #f3c965}.bc-service-list-v251{overflow:auto;padding:0 30px 30px;display:grid;gap:12px}';
const cssInsert='.bc-service-focus-v255[data-urgent="true"]{border-color:#f3c965;box-shadow:inset 4px 0 0 #f3c965}.bc-service-focus-v255[data-recovery="true"]{border-color:#ffad7a;box-shadow:inset 4px 0 0 #ffad7a}.bc-service-list-v251{overflow:auto;padding:0 30px 30px;display:grid;gap:12px}';
if(!s.includes(cssNeedle)) throw new Error("V100.2.56 guard failed: First Priority CSS anchor not found. No files changed.");
s=s.replace(cssNeedle,cssInsert);

const focusNeedle='   const first=rows[0]||null,firstStage=first?serviceStage(first):null,firstUrgent=!!(first&&serviceNeedsAttention(first));\n   if(focus){focus.dataset.urgent=String(firstUrgent);focus.innerHTML=first?`<div><small>First priority</small><strong>${escapeHtml(firstUrgent?(serviceAttentionLabel(first)||"Needs attention"):"Service on pace")}</strong></div><span>${escapeHtml(first.guest||"Guest")} · ${escapeHtml(serviceTableLabel(first))} · ${escapeHtml(firstStage?.action||"Continue service")}</span>`:`<div><small>First priority</small><strong>No active tables</strong></div><span>Service is clear.</span>`;}';
const focusInsert='   const first=rows[0]||null,firstStage=first?serviceStage(first):null,firstUrgent=!!(first&&serviceNeedsAttention(first)),firstRecovery=first?serviceRecoveryException(first):null;\n   // V100.2.56 — explain the exception and give one recovery action without creating a manager dashboard.\n   if(focus){focus.dataset.urgent=String(firstUrgent);focus.dataset.recovery=String(!!firstRecovery);focus.innerHTML=first?`<div><small>First priority</small><strong>${escapeHtml(firstRecovery?"Recovery needed":firstUrgent?(serviceAttentionLabel(first)||"Needs attention"):"Service on pace")}</strong></div><span>${escapeHtml(first.guest||"Guest")} · ${escapeHtml(serviceTableLabel(first))} · ${escapeHtml(firstRecovery?`${serviceRecoveryReason(first)} · ${firstRecovery.action}`:(firstStage?.action||"Continue service"))}</span>`:`<div><small>First priority</small><strong>No active tables</strong></div><span>Service is clear.</span>`;}';
if(!s.includes(focusNeedle)) throw new Error("V100.2.56 guard failed: V100.2.55 First Priority render anchor not found. No files changed.");
s=s.replace(focusNeedle,focusInsert);

const newFloorIndex=s.indexOf(floorMarker);
if(newFloorIndex<0 || s.slice(newFloorIndex)!==protectedFloor) throw new Error("V100.2.56 floor protection failed: protected Floor code changed. No files written.");

fs.copyFileSync(file,file+".v100.2.56.bak");
fs.writeFileSync(file,s);
console.log(JSON.stringify({ok:true,version:"100.2.56",wave:"Service Exception / Recovery Intelligence",architecture:"guarded Service-only patch",exceptionThreshold:"1.5x stage pace",floorRenderer:"byte-for-byte protected from V100.2.47 marker onward"},null,2));
