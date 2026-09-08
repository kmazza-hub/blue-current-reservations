"use strict";
const fs=require("fs"); const path=require("path");
const root=path.resolve(__dirname,"../..");
const files=[]; function walk(d){ if(!fs.existsSync(d))return; for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name); if(e.isDirectory())walk(p); else if(e.isFile()&&p.endsWith(".js"))files.push(p);} }
walk(path.join(root,"client","js"));
const text=files.map(f=>fs.readFileSync(f,"utf8")).join("\n");
const checks=[
 ["V100.2.13 marker", text.includes("__bcDynamicTableSelectionV100_2_13")],
 ["arrival action added", text.includes("bc-arrival-action-v100-2-13")],
 ["explicit mark arrived", text.includes('action.textContent = "Mark arrived"')],
 ["expected state preserved", text.includes('return "expected"')],
 ["arrived state supported", text.includes('status === "arrived"')],
 ["seated table status supported", text.includes('`Seated · Table ${tableNumber}`')],
 ["expected CTA says reserve", text.includes('`Reserve Table ${number} for ${shortName}`')],
 ["arrived CTA is one tap seat", text.includes('button.dataset.bcAssignmentState = "seat-ready"')],
 ["direct seat helper", text.includes("seatArrivedGuestDirectly")],
 ["held state prevents premature seat", text.includes('button.dataset.bcAssignmentState = "held"')],
 ["dynamic selected table preserved", text.includes("__bcHostSelectedTableV100_2_13")],
 ["detail starts collapsed", text.includes("setDetailVisibility(false)")]
];
const failed=checks.filter(([,ok])=>!ok); console.log(JSON.stringify({ok:failed.length===0,version:"100.2.13",checks:checks.map(([name,ok])=>({name,ok})),failed:failed.map(([name])=>name)},null,2)); if(failed.length)process.exit(1);
