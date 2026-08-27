"use strict";
const fs=require("fs"),path=require("path");
const root=process.cwd(),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const mod=read("client/js/manager-action-ownership-v100.2.69.js");
const mgr=read("client/js/manager-operations-truth-v100.2.68.js");
const actions=read("server/services/actionListService.js");
const api=read("client/js/cloud/cloudApi.js");
const floor=read("client/js/floor-reservations-v62.0.js");
const html=read("client/index.html");
const checks=[
 ["version marker",/V100\.2\.69 — Manager Action Ownership \/ Accountability/.test(mod)],
 ["uses existing V100.2.68 state",/BlueCurrentManagerTruthV100_2_68\?\.getState/.test(mod)],
 ["does not create a second manager action queue",!/createManagerAction\(/.test(mod)],
 ["unowned state is explicit",/text:"Unowned"/.test(mod)],
 ["owned state comes only from assignedTo",/action\?\.assignedTo/.test(mod)],
 ["take ownership uses authenticated manager identity",/api\.me\(\)/.test(mod)&&/currentUserName/.test(mod)],
 ["assignment uses existing Manager Action PATCH",/updateManagerAction\(id,\{locationId:LOCATION_ID,assign:true,assignedTo:name\}\)/.test(mod)],
 ["assignment refreshes authoritative manager view",/BlueCurrentManagerTruthV100_2_68\?\.refresh/.test(mod)],
 ["summary exposes owned open actions",/Owned open actions/.test(mod)],
 ["summary exposes unowned open actions",/Unowned open actions/.test(mod)],
 ["completed actions excluded from accountability counts",/filter\(x=>!x\.completed\)/.test(mod)],
 ["V100.2.68 human completion remains intact",/updateManagerAction\(id,\{locationId:LOCATION_ID,completed:true\}\)/.test(mgr)],
 ["server service supports explicit assignment",/if \(patch\.assign\)/.test(actions)&&/changes\.assignedTo/.test(actions)],
 ["server service records assignedBy and assignedAt",/changes\.assignedAt/.test(actions)&&/changes\.assignedBy/.test(actions)],
 ["automatic actions remain non-editable but assignable",/Automatic actions cannot be edited/.test(actions)&&/if \(patch\.assign\)/.test(actions)],
 ["Cloud API exposes authenticated me",/me\(\) \{ return this\.request\("\/api\/auth\/me"\); \}/.test(api)],
 ["Cloud API exposes manager action update",/updateManagerAction\(id, payload\)/.test(api)],
 ["module loads after V100.2.68",html.indexOf("manager-action-ownership-v100.2.69.js")>html.indexOf("manager-operations-truth-v100.2.68.js")],
 ["Staffing remains loaded",html.includes("staff-attendance-v100.2.66.js")],
 ["Kitchen remains loaded",html.includes("kitchen-priority-v100.2.62.js")],
 ["protected Floor restoration remains",/V100\.2\.47 — Floor Layout Restoration/.test(floor)]
];
let passed=0;for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(ok)passed++;}
console.log(`V100.2.69 validation ${passed}/${checks.length}`);if(passed!==checks.length)process.exit(1);