"use strict";
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..", "..");
const jsRoot = path.join(root, "client", "js");
const css = fs.readFileSync(path.join(root, "client", "styles.css"), "utf8");
const files=[];
(function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(p.endsWith('.js'))files.push(p);}})(jsRoot);
const source=files.map(f=>fs.readFileSync(f,'utf8')).join('\n');
const checks=[
  ["assignment becomes an explicit seat action", source.includes("Seat ${shortName} at Table ${tableNumber}")],
  ["assignment state is owned explicitly", source.includes('button.dataset.bcAssignmentState = "assigned"')],
  ["seating transitions table to seated", source.includes('table.classList.add("seated", "selected")')],
  ["guest location is surfaced", source.includes("Seated · Table ${tableNumber}")],
  ["arrival record stores table", source.includes("arrival.dataset.bcTable = tableNumber")],
  ["arrival record stores seated state", source.includes('arrival.dataset.bcGuestStatus = "seated"')],
  ["selected detail changes to current guest", source.includes('nextGuestLabel.textContent = "Current guest"')],
  ["stale assignment CTA is removed", source.includes("button.hidden = true")],
  ["seated CTA cannot fire again", source.includes("button.disabled = true")],
  ["lifecycle status has readable styling", css.includes(".host-table-lifecycle-status")],
  ["seated arrival chip has explicit styling", css.includes(".arrival-chip.bc-seated-table")]
];
const failed=checks.filter(([,ok])=>!ok).map(([name])=>name);
console.log(JSON.stringify({ok:failed.length===0,repair:"V100.2.10 Table Assignment & Seating Lifecycle",baselineVersion:"100.0.0",checks:checks.map(([name,ok])=>({name,ok})),failed},null,2));
if(failed.length)process.exit(1);
