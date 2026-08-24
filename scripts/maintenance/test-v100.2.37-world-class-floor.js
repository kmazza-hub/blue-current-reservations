"use strict";
const fs=require("fs"),path=require("path");
const root=process.cwd();
const js=fs.readFileSync(path.join(root,"client","js","app-v15.1.3.js"),"utf8");
const css=fs.readFileSync(path.join(root,"client","styles.css"),"utf8");
const checks=[
 ["JS marker",js.includes("V100.2.37 — World-Class Floor Map Design System")],
 ["CSS marker",css.includes("V100.2.37 — World-Class Floor Map Design System")],
 ["capacity label",js.includes("data-bc-top-label")||js.includes("bcTopLabel")],
 ["2-top geometry",css.includes("bc-top-2-v100-2-37")],
 ["4-top geometry",css.includes("bc-top-4-v100-2-37")],
 ["6-top geometry",css.includes("bc-top-6-v100-2-37")],
 ["8-top geometry",css.includes("bc-top-8-v100-2-37")],
 ["main architecture",js.includes("bc-main-booth-wall-v100-2-37")],
 ["waterfront architecture",js.includes("bc-water-window-rail-v100-2-37")],
 ["private architecture",js.includes("bc-private-banquette-v100-2-37")],
 ["state styling",css.includes(".host-table.reserved")&&css.includes(".host-table.cleaning")],
 ["selection styling",css.includes(".host-table.selected")]
];
checks.forEach(([name,ok])=>console.log(`${ok?'PASS':'FAIL'} ${name}`));
const failed=checks.filter(([,ok])=>!ok);console.log(`\n${checks.length-failed.length}/${checks.length} checks passed.`);if(failed.length)process.exit(1);
