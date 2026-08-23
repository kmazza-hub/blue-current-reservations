"use strict";
const fs=require("fs");
const path=require("path");
const root=process.cwd();
const css=fs.readFileSync(path.join(root,"client","styles.css"),"utf8");
const checks=[
  ["patch marker",css.includes("V100.2.28 — Host Action Card Readability + Seat Button Contrast")],
  ["reserved tool scoped",css.includes(".bc-reserved-table-tool-v100-2-26")],
  ["linked card strong text",css.includes(".bc-reserved-linked-v100-2-26 strong")],
  ["guest select contrast",css.includes("background:#082b35 !important")&&css.includes("color:#ffffff !important")],
  ["waitlist seat button covered",css.includes("#waitlistQueue .queue-item > button")],
  ["arrival button covered",css.includes("#arrivalQueue .queue-item > button")],
  ["seat white text enforced",css.includes("-webkit-text-fill-color:#ffffff !important")],
  ["disabled readable",css.includes("color:#486269 !important")],
  ["release readable",css.includes("background:#fff5df !important")&&css.includes("color:#5a3c00 !important")],
  ["touch target",css.includes("min-height:56px !important")]
];
const failed=checks.filter(([,ok])=>!ok).map(([name])=>name);
console.log(JSON.stringify({ok:failed.length===0,version:"100.2.28",checks:checks.map(([name,ok])=>({name,ok})),failed},null,2));
if(failed.length) process.exit(1);
