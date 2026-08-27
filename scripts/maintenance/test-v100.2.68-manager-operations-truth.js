"use strict";
const fs=require("fs"),path=require("path");
const root=process.cwd(),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const mod=read("client/js/manager-operations-truth-v100.2.68.js");
const api=read("client/js/cloud/cloudApi.js");
const actions=read("server/services/actionListService.js");
const feed=read("server/services/operationsFeedService.js");
const command=read("server/services/commandCenterService.js");
const floor=read("client/js/floor-reservations-v62.0.js");
const html=read("client/index.html");
const checks=[
 ["version marker",/V100\.2\.68 — Manager Operations Truth Foundation/.test(mod)],
 ["uses live Manager Actions API",/api\.managerActions\(LOCATION_ID\)/.test(mod)],
 ["uses live Operations Feed API",/api\.operationsFeed\(LOCATION_ID,"all",20\)/.test(mod)],
 ["does not call legacy commandCenter snapshot",!/api\.commandCenter\(/.test(mod)],
 ["open actions exclude completed",/filter\(x=>!x\.completed\)/.test(mod)],
 ["priority sorts high before medium and low",/high:0,medium:1,low:2/.test(mod)],
 ["first priority comes from real open action",/const priority=first\?/.test(mod)],
 ["human completion uses manager action PATCH",/updateManagerAction\(id,\{locationId:LOCATION_ID,completed:true\}\)/.test(mod)],
 ["does not create autonomous manager actions",!/createManagerAction\(/.test(mod)],
 ["explicitly excludes forecast/revenue readiness from primary view",/Forecast revenue, synthetic readiness scores/.test(mod)],
 ["Manager Actions service is live-operational",/mode: "live-operational-actions"/.test(actions)],
 ["automatic actions derive from persisted operating records",/pendingPto/.test(actions)&&/lowInventory/.test(actions)&&/openMaintenance/.test(actions)&&/latestHandoff/.test(actions)],
 ["Operations Feed derives from stored events, audit, and handoffs",/operationsEvents/.test(feed)&&/auditLogs/.test(feed)&&/shiftHandoffs/.test(feed)],
 ["legacy Command Center contains financial baseline and is intentionally bypassed",/commandCenterBaseline/.test(command)&&/forecastRevenue/.test(command)],
 ["Cloud API exposes managerActions and operationsFeed",/managerActions\(locationId = "loc_marina"\)/.test(api)&&/operationsFeed\(locationId = "loc_marina"/.test(api)],
 ["module loads after command-live script",html.indexOf("manager-operations-truth-v100.2.68.js")>html.indexOf("command-live-v61.50.js")],
 ["staffing truth remains loaded",html.includes("staff-attendance-v100.2.66.js")],
 ["Kitchen remains loaded",html.includes("kitchen-priority-v100.2.62.js")],
 ["protected Floor restoration remains",/V100\.2\.47 — Floor Layout Restoration/.test(floor)]
];
let passed=0;for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(ok)passed++;}
console.log(`V100.2.68 validation ${passed}/${checks.length}`);if(passed!==checks.length)process.exit(1);