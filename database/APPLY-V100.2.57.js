"use strict";
const fs=require("fs"),path=require("path");
const root=process.cwd();
const floorFile=path.join(root,"client","js","floor-reservations-v62.0.js");
const htmlFile=path.join(root,"client","index.html");
const bridgeDst=path.join(root,"client","js","service-table-lifecycle-v100.2.57.js");
if(!fs.existsSync(floorFile)||!fs.existsSync(htmlFile)) throw new Error("V100.2.57 requires the V100.2.56 client baseline.");
let floor=fs.readFileSync(floorFile,"utf8"),html=fs.readFileSync(htmlFile,"utf8");
if(!floor.includes("V100.2.56 — Service Exception / Recovery Intelligence")) throw new Error("V100.2.57 requires V100.2.56 Service Exception / Recovery Intelligence.");
if(!floor.includes("V100.2.47 — Floor Layout Restoration")) throw new Error("Protected Floor restoration marker missing; refusing to apply.");
if(floor.includes("V100.2.57 — Service Completion / Table Turn Handoff")&&fs.existsSync(bridgeDst)){console.log(JSON.stringify({ok:true,version:"100.2.57",status:"already-applied"},null,2));process.exit(0);}

const floorMarker="// V100.2.47 — Floor Layout Restoration";
const floorIndex=floor.indexOf(floorMarker);
const protectedFloor=floor.slice(floorIndex);

// Forward repair for the malformed V100.2.56 recovery explanation generated in the prior wave.
const recoveryLine=/ function serviceRecoveryReason\(p\)\{[^\n]*\}/;
if(!recoveryLine.test(floor)) throw new Error("V100.2.57 compatibility guard failed: recovery explanation function missing.");
floor=floor.replace(recoveryLine,' function serviceRecoveryReason(p){const x=serviceRecoveryException(p);return x?`${x.reason} · ${x.minutes}m in this stage`:"";}');

const acceptNeedle=' function acceptServiceHandoff(detail={}){\n   const guest=String(detail.guest||"").trim(); if(!guest)return;\n   const next={guest,partySize:Number(detail.partySize||0),guestDetail:String(detail.guestDetail||""),source:String(detail.source||"host"),tableId:String(detail.tableId||detail.table||""),seatedAt:Date.now(),status:"seated"};\n   const key=servicePartyKey(next), rows=readServiceParties().filter(x=>servicePartyKey(x)!==key);\n   rows.unshift(next); writeServiceParties(rows.slice(0,100));\n   window.dispatchEvent(new CustomEvent("bc:service-party-received",{detail:next}));\n }';
const acceptInsert=' function acceptServiceHandoff(detail={}){\n   const guest=String(detail.guest||"").trim(); if(!guest)return null;\n   const incomingTable=String(detail.tableId||detail.table||"").trim(),incomingParty=Number(detail.partySize||0),incomingGuestKey=guestKey(guest);\n   const current=readServiceParties();\n   const existing=current.find(x=>servicePartyKey(x)===servicePartyKey({guest,partySize:incomingParty,tableId:incomingTable}))||current.find(x=>incomingTable&&guestKey(x?.guest||"")===incomingGuestKey&&Number(x?.partySize||0)===incomingParty&&!String(x?.tableId||x?.table||"").trim());\n   const next={...(existing||{}),guest,partySize:incomingParty||Number(existing?.partySize||0),guestDetail:String(detail.guestDetail||existing?.guestDetail||""),source:String(detail.source||existing?.source||"host"),tableId:incomingTable||String(existing?.tableId||existing?.table||""),seatedAt:Number(detail.seatedAt||existing?.seatedAt||Date.now()),status:String(existing?.status||"seated")};\n   const nextKey=servicePartyKey(next),rows=current.filter(x=>servicePartyKey(x)!==nextKey&&x!==existing);\n   rows.unshift(next);writeServiceParties(rows.slice(0,100));\n   window.dispatchEvent(new CustomEvent("bc:service-party-received",{detail:next}));\n   return next;\n }';
if(!floor.includes(acceptNeedle)) throw new Error("V100.2.57 guard failed: V100.2.56 Service intake anchor changed. No files written.");
floor=floor.replace(acceptNeedle,acceptInsert);

const apiNeedle=' window.BlueCurrentServiceHandoff={\n   getActive:()=>readServiceParties().slice(),\n   update:(match,updates={})=>{const rows=readServiceParties();const key=typeof match==="string"?match:null;const next=rows.map(row=>{const hit=typeof match==="function"?match(row):servicePartyKey(row)===key;return hit?{...row,...updates,updatedAt:Date.now()}:row;});writeServiceParties(next);window.dispatchEvent(new CustomEvent("bc:service-party-updated"));return next.slice();},\n   clear:(match)=>{const rows=readServiceParties();const keep=typeof match==="function"?rows.filter(x=>!match(x)):rows.filter(x=>servicePartyKey(x)!==String(match||""));writeServiceParties(keep);window.dispatchEvent(new CustomEvent("bc:service-party-updated"));return keep.slice();}\n };';
const apiInsert=' // V100.2.57 — Service Completion / Table Turn Handoff. Table state remains human-owned: completion moves SEATED → CLEANING, never directly to OPEN.\n window.BlueCurrentServiceHandoff={\n   getActive:()=>readServiceParties().slice(),\n   accept:(detail)=>acceptServiceHandoff(detail),\n   update:(match,updates={})=>{const rows=readServiceParties();const key=typeof match==="string"?match:null;const next=rows.map(row=>{const hit=typeof match==="function"?match(row):servicePartyKey(row)===key;return hit?{...row,...updates,updatedAt:Date.now()}:row;});writeServiceParties(next);window.dispatchEvent(new CustomEvent("bc:service-party-updated"));return next.slice();},\n   clear:(match)=>{const rows=readServiceParties();const keep=typeof match==="function"?rows.filter(x=>!match(x)):rows.filter(x=>servicePartyKey(x)!==String(match||""));writeServiceParties(keep);window.dispatchEvent(new CustomEvent("bc:service-party-updated"));return keep.slice();},\n   complete:(match)=>{const rows=readServiceParties(),key=typeof match==="string"?match:null,row=rows.find(x=>typeof match==="function"?match(x):servicePartyKey(x)===key);if(!row)return{ok:false,reason:"service-party-not-found"};const result=window.BlueCurrentServiceTableLifecycle?.completeTable?.(row);if(!result?.ok)return result||{ok:false,reason:"table-lifecycle-bridge-unavailable"};const keep=rows.filter(x=>x!==row);writeServiceParties(keep);window.dispatchEvent(new CustomEvent("bc:service-party-completed",{detail:{...row,completedAt:Date.now(),tableState:result.status||"cleaning"}}));window.dispatchEvent(new CustomEvent("bc:service-party-updated"));return{ok:true,...result};}\n };';
if(!floor.includes(apiNeedle)) throw new Error("V100.2.57 guard failed: Service handoff API anchor changed. No files written.");
floor=floor.replace(apiNeedle,apiInsert);

const actionNeedle='   list.querySelectorAll(\'[data-service-action="advance"]\').forEach((button,i)=>button.addEventListener("click",()=>{const row=rows[i];if(!row)return;const stage=serviceStage(row),key=servicePartyKey(row);if(stage.next==="complete")window.BlueCurrentServiceHandoff?.clear?.(key);else window.BlueCurrentServiceHandoff?.update?.(key,{status:stage.next});renderServiceWorkspace();}));';
const actionInsert='   list.querySelectorAll(\'[data-service-action="advance"]\').forEach((button,i)=>button.addEventListener("click",()=>{const row=rows[i];if(!row)return;const stage=serviceStage(row),key=servicePartyKey(row);if(stage.next==="complete"){const result=window.BlueCurrentServiceHandoff?.complete?.(key);if(!result?.ok){button.textContent="Check table link";button.setAttribute("aria-label",`Cannot complete service: ${result?.reason||"table handoff unavailable"}`);return;}}else window.BlueCurrentServiceHandoff?.update?.(key,{status:stage.next});renderServiceWorkspace();}));';
if(!floor.includes(actionNeedle)) throw new Error("V100.2.57 guard failed: Service lifecycle action anchor changed. No files written.");
floor=floor.replace(actionNeedle,actionInsert);

const newFloorIndex=floor.indexOf(floorMarker);
if(newFloorIndex<0||floor.slice(newFloorIndex)!==protectedFloor) throw new Error("V100.2.57 floor protection failed: protected Floor restoration code changed. No files written.");

const floorScript='<script src="js/floor-reservations-v62.0.js?v=62.0.0"></script>';
const bridgeScript='<script src="js/service-table-lifecycle-v100.2.57.js?v=100.2.57"></script>';
if(!html.includes(floorScript)) throw new Error("V100.2.57 guard failed: Service controller script tag not found.");
if(!html.includes(bridgeScript)) html=html.replace(floorScript,`${floorScript}\n${bridgeScript}`);

fs.copyFileSync(floorFile,floorFile+".v100.2.57.bak");
fs.copyFileSync(htmlFile,htmlFile+".v100.2.57.bak");
fs.writeFileSync(floorFile,floor);
fs.writeFileSync(htmlFile,html);
fs.mkdirSync(path.dirname(bridgeDst),{recursive:true});
fs.copyFileSync(path.join(__dirname,"patches","client","js","service-table-lifecycle-v100.2.57.js"),bridgeDst);
const testSrc=path.join(__dirname,"patches","scripts","maintenance","test-v100.2.57-service-table-turn-handoff.js"),testDst=path.join(root,"scripts","maintenance","test-v100.2.57-service-table-turn-handoff.js");
fs.mkdirSync(path.dirname(testDst),{recursive:true});fs.copyFileSync(testSrc,testDst);
console.log(JSON.stringify({ok:true,version:"100.2.57",wave:"Service Completion / Table Turn Handoff",compatibilityFix:"V100.2.56 recovery explanation repaired",architecture:"isolated table-lifecycle bridge + guarded Service API",completion:"SEATED -> CLEANING only",openState:"human confirmation still required",floorRenderer:"byte-for-byte protected from V100.2.47 marker onward"},null,2));
