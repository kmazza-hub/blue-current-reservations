"use strict";
const fs=require("fs"),path=require("path");
const root=process.cwd();
const js=fs.readFileSync(path.join(root,"client","js","app-v15.1.3.js"),"utf8");
const css=fs.readFileSync(path.join(root,"client","styles.css"),"utf8");
const checks=[
 ["V100.2.33 JS marker installed",js.includes("V100.2.33 — Neutral Table Detail Dismiss")],
 ["close button is created",js.includes("bc-neutral-detail-close-v100-2-33")],
 ["close action hides detail",js.includes("detail.hidden = true")],
 ["close action clears selected table",js.includes("host-table.selected")],
 ["empty floor click dismisses",js.includes("event.target.closest('.host-table, #hostTableDetail')")],
 ["Escape dismisses",js.includes("event.key !== 'Escape'")],
 ["close button has accessible label",js.includes("Close table details")],
 ["close control CSS installed",css.includes("V100.2.33 — Neutral Table Detail Dismiss")],
 ["close control keeps dark readable text",css.includes("-webkit-text-fill-color: #082f3d")]
];
const failed=checks.filter(([,ok])=>!ok).map(([n])=>n);
console.log(JSON.stringify({ok:!failed.length,version:"100.2.33",checks:checks.map(([name,ok])=>({name,ok})),failed},null,2));
if(failed.length) process.exit(1);
