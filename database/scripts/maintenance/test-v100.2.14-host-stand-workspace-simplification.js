"use strict";
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "../..");
const clientJs = path.join(root, "client", "js");
function walk(dir,out=[]){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p,out);else if(e.isFile()&&e.name.endsWith(".js"))out.push(p);}return out;}
const files=walk(clientJs);
const source=files.map((f)=>fs.readFileSync(f,"utf8")).join("\n");
const checks=[
  ["V100.2.14 marker", source.includes("V100.2.14 — Host Stand Workspace Simplification")],
  ["workspace guard", source.includes("__bcHostWorkspaceSimplificationV100_2_14")],
  ["Floor workspace", source.includes("activate('floor')")],
  ["Reservations workspace", source.includes("name === 'reservations'")],
  ["Waitlist workspace", source.includes("name === 'waitlist'")],
  ["Guests workspace", source.includes("name === 'guests'")],
  ["floor hides outside floor", source.includes("floorPanel.hidden = true")],
  ["selected table cleared", source.includes("clearTransientFloorUI")],
  ["stale detail hidden", source.includes("detail.setAttribute('aria-hidden', 'true')")],
  ["guest search created", source.includes("bcHostGuestSearchV100_2_14")],
  ["reservations maps to arrivals", source.includes("forceQueueView('arrivals')")],
  ["waitlist maps to waitlist", source.includes("forceQueueView('waitlist')")],
  ["V100.2.13 preserved", source.includes("__bcDynamicTableSelectionV100_2_13")]
];
const failed=checks.filter(([,ok])=>!ok).map(([name])=>name);
console.log(JSON.stringify({ok:failed.length===0,version:"100.2.14",checks:checks.map(([name,ok])=>({name,ok})),failed},null,2));
if(failed.length)process.exit(1);
