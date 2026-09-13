"use strict";

const assert=require("assert"),fs=require("fs"),path=require("path"),vm=require("vm");
const root=path.resolve(__dirname,"../.."),read=file=>fs.readFileSync(path.join(root,file),"utf8"),checks=[];
const check=(label,condition)=>{assert.ok(condition,label);checks.push(label);console.log(`PASS: ${label}`)};

const runtime=read("client/js/staff-operations-runtime-v100.3.62.js");
const loader=read("client/js/runtime-performance-v100.2.70.js");
const workforce=read("client/js/modules/workforceFoundation.js");
const scheduling=read("client/js/modules/scheduling.js");
const router=read("server/api/router.js");
const index=read("client/index.html");
const listeners={},calls=[],reloads=[];
class Api{constructor(){this.token=""}setToken(token){this.token=token}}
const documentElement={dataset:{}};
const sandbox={
 console,CustomEvent:class{constructor(type,init){this.type=type;this.detail=init?.detail}},setTimeout:fn=>{fn();return 1},
 localStorage:{getItem:key=>key==="blueCurrentV3230Token"?"certified-session-token":""},
 document:{documentElement},
 window:{BlueCurrentAssetMode:"focused",BlueCurrentCloudApi:Api,addEventListener(type,handler){listeners[type]=handler},createBlueCurrentWorkforceFoundationModule(bus,state,cloud){calls.push(["workforce",bus,state,cloud]);return{reload(){reloads.push("workforce")}}},createBlueCurrentSchedulingModule(bus,state,cloud){calls.push(["scheduling",bus,state,cloud]);return{reload(){reloads.push("scheduling")}}}}
};
vm.runInNewContext(runtime,sandbox,{filename:"staff-operations-runtime-v100.3.62.js"});
check("Focused startup initializes the real Workforce Foundation module",calls.some(call=>call[0]==="workforce"));
check("Focused startup initializes the real Scheduling module",calls.some(call=>call[0]==="scheduling"));
check("Both operational modules share one authenticated API authority",calls.length===2&&calls[0][3].api===calls[1][3].api&&calls[0][3].api.token==="certified-session-token");
check("Authentication readiness refreshes both operational modules",Boolean(listeners["bluecurrent:auth-session-state"])&&(listeners["bluecurrent:auth-session-state"]({detail:{snapshot:{authenticated:true,session:{role:"manager"}}}}),reloads.includes("workforce")&&reloads.includes("scheduling")));
check("Staff runtime loads module factories before its bootstrap",/modules\/workforceFoundation\.js\?v=100\.3\.(?:63|64|65)/.test(loader)&&/modules\/scheduling\.js\?v=100\.3\.(?:63|64|65)/.test(loader)&&loader.indexOf("modules/workforceFoundation.js")<loader.indexOf("staff-operations-runtime-v100.3.62.js"));
check("Add Employee remains connected to the employee creation API",workforce.includes('byId("wffAddEmployee")?.addEventListener("click"')&&workforce.includes("api.createWorkforceEmployee"));
check("Availability, PTO decisions, and shift templates remain actionable",["saveEmployeeAvailability","createPtoRequest","decidePtoRequest","createShiftTemplate"].every(method=>workforce.includes(method)));
check("Schedule creation, editing, deletion, copy, and publication remain actionable",["createScheduleShift","updateScheduleShift","deleteScheduleShift","copyPreviousSchedule","publishSchedule"].every(method=>scheduling.includes(method)));
check("Server preserves authenticated write permission boundaries",router.includes("Scheduling write permission required.")&&router.includes("Workforce write permission required."));
check("V100.3.62 runtime and staff assets remain cache-advanced",/content="100\.3\.(?:62|63|64|65)"/.test(index)&&/runtime-performance-v100\.2\.70\.js\?v=100\.3\.(?:62|63|64|65)/.test(index)&&/staff-operations-runtime-v100\.3\.62\.js\?v=100\.3\.(?:62|63|64|65)/.test(loader));
console.log(`V100.3.62 focused Staff action runtime ${checks.length}/${checks.length}`);
