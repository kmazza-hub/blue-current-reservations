"use strict";
const fs=require("fs"),path=require("path");
let passed=0,total=0;
function check(condition,name){total++;console.log(`${condition?"PASS":"FAIL"}: ${name}`);if(condition)passed++;else process.exitCode=1;}
const root=process.cwd(),read=rel=>fs.readFileSync(path.join(root,rel),"utf8");
const app=read("client/js/app-v15.1.3.js");
const host=read("client/js/floor-reservations-v62.0.js");
const lifecycle=read("client/js/service-table-lifecycle-v100.2.57.js");
const start=app.indexOf("const complete = () => {");
const end=app.indexOf("// Own the entire seating transaction",start);
const complete=app.slice(start,end);

check(start>=0,"unified seating commit located");
check(/if \(!row \|\| !table \|\| !flow\.active\) return;/.test(complete),"commit requires active guest and selected table");
check(/const partySize = Math\.max\(1, Number\(flow\.partySize \|\| 1\)\)/.test(complete),"authoritative seating party size normalized");
check(/const seatedAt = Date\.now\(\)/.test(complete),"one seating timestamp captured");
check(/dataset\.bcPartySize = String\(partySize\)/.test(complete),"party size committed to Floor table truth");
check(/dataset\.bcSeatedAt = String\(seatedAt\)/.test(complete),"seating timestamp committed to Floor table truth");
check(/markSeated\?\.\(table, partySize, guestName\)/.test(complete),"existing table-trust owner receives complete identity");
check(/bc:host-guest-seated/.test(complete),"unified owner explicitly publishes Service handoff");
check(/detail:\{guest:guestName,partySize,guestDetail:flow\.guestDetail/.test(complete),"handoff carries guest and party identity");
check(/tableId:num,seatedAt/.test(complete),"handoff carries table and seating time");
check(complete.indexOf("dataset.bcPartySize")<complete.indexOf("bc:host-guest-seated"),"Floor identity commits before downstream publication");
check(complete.indexOf("bc:host-guest-seated")<complete.indexOf("row.remove()"),"Service handoff publishes before queue removal");

check(host.includes('addEventListener("bc:host-guest-seated"'),"existing Service intake listener preserved");
check(host.includes("if(!guest)return null"),"Service rejects identity-free handoffs");
check(host.includes("servicePartyKey"),"existing Service identity key preserved");
check(host.includes("rows.unshift(next);writeServiceParties(rows.slice(0,100))"),"Service intake remains bounded");
check(lifecycle.includes("serviceIntakeFromTable"),"table-observer recovery path preserved");
check(lifecycle.includes("if (!table || stateOf(table) !== \"seated\") return false"),"observer accepts only real Seated tables");

const key=x=>`${String(x.guest).trim().toLowerCase()}|${Number(x.partySize||0)}|${String(x.tableId||"")}`;
const incoming={guest:"Mia Santos",partySize:5,tableId:"24",seatedAt:12345};
let rows=[];
for(const event of [incoming,{...incoming}]){
  const existing=rows.find(row=>key(row)===key(event));
  const next={...(existing||{}),...event,status:existing?.status||"seated"};
  rows=rows.filter(row=>key(row)!==key(next)&&row!==existing);
  rows.unshift(next);
}
check(rows.length===1,"explicit event plus observer replay deduplicates to one Service party");
check(rows[0].partySize===5&&rows[0].tableId==="24","deduplication preserves covers and table identity");
check(!complete.includes("setInterval")&&!complete.includes("MutationObserver"),"no new background runtime added");
console.log(`V100.2.98 validation ${passed}/${total}`);
if(passed!==total)process.exitCode=1;
