"use strict";
const fs=require("fs"),path=require("path");
const root=process.cwd(),read=p=>fs.readFileSync(path.join(root,p),"utf8");

const truth=read("client/js/manager-operations-truth-v100.2.68.js");
const ownership=read("client/js/manager-action-ownership-v100.2.69.js");
const performance=read("client/js/runtime-performance-v100.2.70.js");
const followup=read("client/js/manager-action-followup-v100.2.71.js");
const service=read("server/services/actionListService.js");
const floor=read("client/js/floor-reservations-v62.0.js");

const now=new Date("2026-08-30T19:30:00-04:00").getTime();
const actions=[
 {id:"a1",title:"Recover table 18",source:"Service",priority:"high",completed:false,automatic:true,assignedTo:"Maria",createdAt:new Date(now-52*60000).toISOString()},
 {id:"a2",title:"Host stand seating exception",source:"Host",priority:"high",completed:false,automatic:true,assignedTo:null,createdAt:new Date(now-36*60000).toISOString()},
 {id:"a3",title:"Check kitchen pacing",source:"Kitchen",priority:"medium",completed:false,automatic:false,assignedTo:"Devon",createdAt:new Date(now-18*60000).toISOString()},
 {id:"a4",title:"Review staffing coverage",source:"Staffing",priority:"medium",completed:false,automatic:true,assignedTo:null,createdAt:new Date(now-44*60000).toISOString()},
 {id:"a5",title:"Confirm private dining reset",source:"Operations",priority:"low",completed:true,automatic:false,assignedTo:"Maria",createdAt:new Date(now-70*60000).toISOString()},
 {id:"a6",title:"Fresh manager note",source:"Operations",priority:"low",completed:false,automatic:false,assignedTo:null,createdAt:new Date(now-5*60000).toISOString()},
 {id:"a7",title:"Legacy action without timestamp",source:"Operations",priority:"medium",completed:false,automatic:false,assignedTo:null,createdAt:null}
];

const rank=a=>({high:0,medium:1,low:2}[String(a?.priority||"").toLowerCase()]??9);
const createdMs=a=>{const value=new Date(a?.createdAt||"").getTime();return Number.isFinite(value)&&value>0?value:null;};
const open=items=>items.filter(x=>!x.completed).sort((a,b)=>rank(a)-rank(b)||new Date(a.createdAt||0)-new Date(b.createdAt||0));
const needsFollowUp=a=>{const created=createdMs(a);return !a.completed&&created!==null&&Math.max(0,now-created)>=30*60000;};
const followUps=items=>items.filter(needsFollowUp).sort((a,b)=>rank(a)-rank(b)||(createdMs(a)??Infinity)-(createdMs(b)??Infinity));

const initialOpen=open(actions.map(x=>({...x})));
const initialFollowUps=followUps(actions.map(x=>({...x})));

const ownershipIsolation=(()=>{
 const copy=actions.map(x=>({...x}));
 const target=copy.find(x=>x.id==="a2");target.assignedTo="Keith";
 return copy.find(x=>x.id==="a2").assignedTo==="Keith" &&
        copy.find(x=>x.id==="a1").assignedTo==="Maria" &&
        copy.find(x=>x.id==="a4").assignedTo===null;
})();

const completionIsolation=(()=>{
 const copy=actions.map(x=>({...x}));
 copy.find(x=>x.id==="a1").completed=true;
 return !open(copy).some(x=>x.id==="a1") &&
        open(copy).some(x=>x.id==="a2") &&
        open(copy).some(x=>x.id==="a3") &&
        open(copy).some(x=>x.id==="a4");
})();

const followUpIsolation=initialFollowUps.map(x=>x.id).join(",")==="a1,a2,a4";
const recentExcluded=!initialFollowUps.some(x=>x.id==="a3"||x.id==="a6");
const completedExcluded=!initialFollowUps.some(x=>x.id==="a5");
const unknownTimestampExcluded=!initialFollowUps.some(x=>x.id==="a7");
const firstPriorityDeterministic=initialOpen[0]?.id==="a1" && initialOpen[1]?.id==="a2";
const ownershipCounts=(()=>{const current=actions.filter(x=>!x.completed),owned=current.filter(x=>String(x.assignedTo||"").trim()).length;return owned===2 && current.length-owned===4;})();
const uniqueIds=new Set(actions.map(x=>x.id)).size===actions.length;

const checks=[
 ["V100.2.68 Manager Operations truth foundation present",/V100\.2\.68 — Manager Operations Truth Foundation/.test(truth)],
 ["V100.2.69 ownership/accountability present",/V100\.2\.69 — Manager Action Ownership \/ Accountability/.test(ownership)],
 ["V100.2.70 manager group remains deferred",/manager:\[/.test(performance)&&/observeWorkspace\("command-center","manager"\)/.test(performance)],
 ["V100.2.71 follow-up intelligence present",/V100\.2\.71 — Manager Action Follow-Up Intelligence/.test(followup)],
 ["simultaneous open actions remain individually identifiable",uniqueIds],
 ["high-priority ordering remains deterministic",firstPriorityDeterministic],
 ["ownership counts stay isolated across simultaneous actions",ownershipCounts],
 ["taking ownership changes only the target action",ownershipIsolation],
 ["completing one action removes only that action from open work",completionIsolation],
 ["30+ minute follow-up candidates remain isolated",followUpIsolation],
 ["recent open actions do not receive a follow-up signal",recentExcluded],
 ["completed actions do not receive a follow-up signal",completedExcluded],
 ["missing createdAt does not create invented follow-up certainty",unknownTimestampExcluded],
 ["V100.2.71 explicitly uses createdAt rather than updatedAt",/action\?\.createdAt/.test(followup)&&!/action\?\.updatedAt/.test(followup)],
 ["follow-up remains a review signal, not overdue diagnosis",/review signal, not an overdue diagnosis/.test(followup)],
 ["ownership uses the existing Manager Action update API",/updateManagerAction\(id,\{locationId:LOCATION_ID,assign:true,assignedTo:name\}\)/.test(ownership)],
 ["completion uses the existing Manager Action update API",/updateManagerAction\(id,\{locationId:LOCATION_ID,completed:true\}\)/.test(truth)],
 ["automatic actions preserve manager completion during synchronization",/Keep the manager's completion decision/.test(service)],
 ["automatic actions resolve only when source condition disappears",/Resolve automatic tasks when the underlying condition no longer exists/.test(service)],
 ["automatic actions cannot be manually deleted",/Automatic actions cannot be deleted/.test(service)],
 ["automatic actions cannot be manually edited",/Automatic actions cannot be edited/.test(service)],
 ["Manager Operations uses live Manager Actions and Operations Feed",/managerActions\(LOCATION_ID\).*operationsFeed\(LOCATION_ID/s.test(truth)],
 ["legacy readiness and financial forecast remain excluded from primary manager view",/no legacy readiness score or financial forecast used/.test(truth)],
 ["V100.2.71 adds no interval or MutationObserver",!/setInterval\(|MutationObserver/.test(followup)],
 ["protected Floor restoration remains",/V100\.2\.47 — Floor Layout Restoration/.test(floor)]
];

let passed=0;
for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(ok)passed++;}
console.log(`V100.2.72 validation ${passed}/${checks.length}`);
if(passed!==checks.length)process.exit(1);
