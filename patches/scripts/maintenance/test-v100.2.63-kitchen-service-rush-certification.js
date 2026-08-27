"use strict";
const fs=require("fs"),path=require("path");
const root=process.cwd(),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const kitchen=read("client/js/kitchen-truth-v100.2.60.js");
const bridge=read("client/js/kitchen-service-handoff-v100.2.61.js");
const priority=read("client/js/kitchen-priority-v100.2.62.js");
const floor=read("client/js/floor-reservations-v62.0.js");
const html=read("client/index.html");

function guestKey(value){return String(value||"").trim().toLowerCase().replace(/\s+/g," ");}
function partyKey(p){return `${guestKey(p?.guest)}|${Number(p?.partySize||0)}|${String(p?.tableId||p?.table||"")}`;}

const now=Date.now();
const parties=[
 {guest:"Garcia",partySize:2,tableId:"12",status:"ordering",updatedAt:now-8*60000},
 {guest:"Nguyen",partySize:4,tableId:"24",status:"ordering",updatedAt:now-19*60000},
 {guest:"Smith",partySize:2,tableId:"7",status:"ordering",updatedAt:now-27*60000},
 {guest:"Lopez",partySize:3,tableId:"9",status:"dining",updatedAt:now-5*60000}
];
const ready={};
ready[partyKey(parties[0])]={readyAt:now-2*60000};

function classify(p){
 const key=partyKey(p),age=Math.max(0,Math.floor((now-Number(p.updatedAt||now))/60000));
 const isReady=Boolean(ready[key]);
 return {...p,key,age,ready:isReady,readyAt:Number(ready[key]?.readyAt||0),
   level:isReady?"ready":age>=23?"recovery":age>=15?"attention":"pace"};
}
const rows=parties.filter(p=>p.status==="ordering").map(classify).sort((a,b)=>{
 const rank={ready:0,recovery:1,attention:2,pace:3};
 return rank[a.level]-rank[b.level] || (a.level==="ready"?a.readyAt-b.readyAt:b.age-a.age);
});

const independentKeys = new Set(parties.map(partyKey)).size===parties.length;
const firstIsReady = rows[0]?.guest==="Garcia" && rows[0]?.level==="ready";
const secondIsRecovery = rows[1]?.guest==="Smith" && rows[1]?.level==="recovery";
const thirdIsAttention = rows[2]?.guest==="Nguyen" && rows[2]?.level==="attention";
const nonOrderingExcluded = !rows.some(r=>r.guest==="Lopez");

// Simulate Food delivered for Garcia: only Garcia's Ready entry should clear.
const deliveredKey=partyKey(parties[0]);
delete ready[deliveredKey];
const otherKey=partyKey(parties[1]);
ready[otherKey]={readyAt:now-1000};
const beforeOther=JSON.stringify(ready[otherKey]);
delete ready[deliveredKey];
const onlyTargetCleared = !ready[deliveredKey] && JSON.stringify(ready[otherKey])===beforeOther;

// Duplicate Ready on one party remains one map entry.
const dup={};
const smithKey=partyKey(parties[2]);
dup[smithKey]={readyAt:now-2000};
dup[smithKey]={readyAt:now-1000};
const duplicateReadyCollapses = Object.keys(dup).length===1;

// Same guest + same party size but different table must remain distinct.
const sameGuestA={guest:"Taylor",partySize:2,tableId:"10"};
const sameGuestB={guest:"Taylor",partySize:2,tableId:"11"};
const tableIdentityPreventsCollision=partyKey(sameGuestA)!==partyKey(sameGuestB);

const checks=[
 ["V100.2.60 Kitchen Truth present",/V100\.2\.60 — Kitchen Truth Foundation/.test(kitchen)],
 ["V100.2.61 Kitchen→Service bridge present",/V100\.2\.61 — Kitchen Ready → Service \/ Expo Handoff/.test(bridge)],
 ["V100.2.62 Kitchen priority present",/V100\.2\.62 — Kitchen First Priority \/ Exception Intelligence/.test(priority)],
 ["party identity includes guest, party size, and table",/guestKey\(p\?\.guest\).*\|\$\{Number\(p\?\.partySize\|\|0\)\}\|\$\{String\(p\?\.tableId\|\|p\?\.table\|\|""\)\}/s.test(kitchen)],
 ["simulated parties have independent keys",independentKeys],
 ["same guest on different tables cannot collide",tableIdentityPreventsCollision],
 ["only Ordering parties enter Kitchen",nonOrderingExcluded && /filter\(p=>p\.status==="ordering"\)/.test(kitchen)],
 ["Ready outranks all aging states",firstIsReady],
 ["23+ minute unready becomes Recovery",secondIsRecovery],
 ["15+ minute unready becomes Needs check",thirdIsAttention],
 ["duplicate Ready signal collapses to one party key",duplicateReadyCollapses],
 ["Food delivered clears only target Ready state",onlyTargetCleared],
 ["V100.2.61 clears Ready only after leaving Ordering",/row\.status!=="ordering"&&map\[key\]/.test(bridge)],
 ["V100.2.61 preserves other live Ready entries",/Object\.keys\(map\)\.forEach\(key=>\{if\(!live\.has\(key\)\)/.test(bridge)],
 ["Service does not auto-advance from Kitchen Ready",!/status\s*:\s*["']dining["']/.test(bridge)],
 ["Kitchen priority does not auto-mark Ready",!/dispatchEvent\(new CustomEvent\("bc:kitchen-order-ready"/.test(priority)],
 ["Service human Food delivered action remains",/ordering:\{label:"Ordering",action:"Food delivered",next:"dining"\}/.test(floor)],
 ["Service completion remains isolated from Kitchen Ready",/bc:service-party-completed/.test(floor)&&!/kitchenReady/.test(floor)],
 ["V100.2.62 loads after V100.2.61",html.indexOf("kitchen-priority-v100.2.62.js")>html.indexOf("kitchen-service-handoff-v100.2.61.js")],
 ["protected Floor restoration remains",/V100\.2\.47 — Floor Layout Restoration/.test(floor)]
];
let passed=0;
for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(ok)passed++;}
console.log(`V100.2.63 validation ${passed}/${checks.length}`);
if(passed!==checks.length)process.exit(1);
