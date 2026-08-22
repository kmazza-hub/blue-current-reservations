"use strict";
const fs=require("fs"), path=require("path");
const root=process.cwd(), client=path.join(root,"client","js");
function walk(d,o=[]){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p,o);else if(e.isFile()&&e.name.endsWith(".js"))o.push(p)}return o}
if(!fs.existsSync(client)){console.error("client/js missing");process.exit(1)}
const sources=walk(client).map(f=>({f,t:fs.readFileSync(f,"utf8")}));
const hit=sources.find(x=>x.t.includes("__bcWaitlistSeatFlowV100_2_15"));
if(!hit){console.error("V100.2.15 block not found");process.exit(1)}
const t=hit.t;
const checks=[
 ["workspace dependency present",t.includes("__bcHostWorkspaceSimplificationV100_2_14")],
 ["guided waitlist flow state",t.includes("__bcWaitlistSeatFlowV100_2_15")],
 ["capture prevents legacy instant seating",t.includes("stopImmediatePropagation")&&t.includes("enterTableChoice(row)")],
 ["available/cleaning tables selectable",t.includes("state === 'available' || state === 'cleaning'")],
 ["confirm seating required",t.includes("completeWaitlistSeat")&&t.includes("bc-confirm-seat")],
 ["guest table identity stored",t.includes("table.dataset.bcGuestName = name")&&t.includes("table.dataset.bcGuestStatus = 'seated'")],
 ["waitlist decremented",t.includes("setNumeric('#waitlistBadge', numeric('#waitlistBadge') - 1)")],
 ["seated incremented",t.includes("setNumeric('#seatedCount', numeric('#seatedCount') + 1)")],
 ["completed waitlist row removed",t.includes("row.remove()")],
 ["reservation hold collapses",t.includes("bcReserveCollapseBoundV100215")&&t.includes("assignment?.status === 'assigned'")],
 ["readability style installed",t.includes("bc-host-readability-guided-seating-v100-2-15")&&t.includes("font-size:20px")],
 ["aim small principle encoded",t.includes("Aim small, miss small")]
];
const failed=checks.filter(([,ok])=>!ok);
console.log(JSON.stringify({ok:failed.length===0,version:"100.2.15",repair:"Host Stand Readability + Guided Waitlist Seating",file:path.relative(root,hit.f),checks:checks.map(([name,ok])=>({name,ok})),failed:failed.map(([name])=>name)},null,2));
if(failed.length)process.exit(1);
