"use strict";
const fs=require("fs"),path=require("path");
const root=process.cwd(),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const html=read("client/index.html");
const managerTruth=read("client/js/manager-operations-truth-v100.2.68.js");
const ownership=read("client/js/manager-action-ownership-v100.2.69.js");
const runtime=read("client/js/runtime-performance-v100.2.70.js");
const followup=read("client/js/manager-action-followup-v100.2.71.js");
const floor=read("client/js/floor-reservations-v62.0.js");
const checks=[
 ["V100.2.71 marker",/V100\.2\.71 — Manager Action Follow-Up Intelligence/.test(followup)],
 ["30-minute review threshold is explicit",/FOLLOW_UP_AFTER_MS=30\*60\*1000/.test(followup)],
 ["signal uses createdAt rather than updatedAt",/action\?\.createdAt/.test(followup)&&!/action\?\.updatedAt/.test(followup)],
 ["only still-open actions qualify",/!action\?\.completed/.test(followup)],
 ["copy avoids overdue diagnosis",/not an overdue diagnosis/.test(followup)],
 ["no Manager Action mutation from follow-up module",!/updateManagerAction|createManagerAction|deleteManagerAction/.test(followup)],
 ["no new interval",!/setInterval\s*\(/.test(followup)],
 ["no new mutation observer",!/MutationObserver/.test(followup)],
 ["Manager Truth emits narrow render event",/bluecurrent:manager-operations-rendered/.test(managerTruth)],
 ["follow-up listens to narrow render event",/addEventListener\("bluecurrent:manager-operations-rendered",decorate\)/.test(followup)],
 ["manager runtime order preserves .68→.69→.71",runtime.indexOf("manager-operations-truth-v100.2.68.js")<runtime.indexOf("manager-action-ownership-v100.2.69.js")&&runtime.indexOf("manager-action-ownership-v100.2.69.js")<runtime.indexOf("manager-action-followup-v100.2.71.js")],
 [".71 remains runtime-lazy with Manager workspace",html.includes('type="text/bluecurrent-runtime-lazy" data-src="js/manager-action-followup-v100.2.71.js?v=100.2.71" data-bc-runtime-group="manager"')],
 ["V100.2.69 ownership remains present",/V100\.2\.69 — Manager Action Ownership \/ Accountability/.test(ownership)],
 ["protected Floor restoration remains",/V100\.2\.47 — Floor Layout Restoration/.test(floor)],
 ["follow-up module does not mutate restaurant lifecycle",!/bc:host-table-cleaning|bc:service-party-completed|classList\.add\("cleaning"\)|serviceStage|kitchenState|timeClock/.test(followup)]
];
let passed=0;for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(ok)passed++;}
console.log(`V100.2.71 validation ${passed}/${checks.length}`);if(passed!==checks.length)process.exit(1);
