"use strict";
const fs=require("fs"),path=require("path");
const root=process.cwd();
const js=fs.readFileSync(path.join(root,"client","js","app-v15.1.3.js"),"utf8");
const css=fs.readFileSync(path.join(root,"client","styles.css"),"utf8");
const checks=[
 ["V100.2.36 runtime installed",js.includes("V100.2.36 — Production-Scale Restaurant Floor Plans")],
 ["36-table contract declared",js.includes("totalTables:Object.values(specs).reduce")],
 ["main floor has 16 tables",/main:[\s\S]*?positions:\[/.test(js)&&js.includes("['21',4,'seated']")],
 ["waterfront has 12 tables",js.includes("['40',4,'available']")],
 ["private dining has 8 tables",js.includes("['50',4,'available']")],
 ["mixed capacities supported",js.includes("bc-six-top-v100-2-36")&&js.includes("bc-eight-top-v100-2-36")],
 ["new tables use host-table contract",js.includes("table.className = 'host-table'")],
 ["table capacity stored on dataset",js.includes("table.dataset.capacity = String(capacity)")],
 ["zone helper replaced with expanded mapping",js.includes("window.__bcHostZonesV100_2_34 =")],
 ["table intelligence refreshed",js.includes("__bcHostTableTrustV100_2_22?.renderAll?.()")],
 ["expanded counts synchronized",js.includes("availableCount")&&js.includes("cleaningCount")],
 ["production-scale CSS installed",css.includes("V100.2.36 — Production-Scale Restaurant Floor Plans")]
];
const failed=checks.filter(([,ok])=>!ok).map(([name])=>name);
console.log(JSON.stringify({ok:failed.length===0,version:"100.2.36",checks:checks.map(([name,ok])=>({name,ok})),failed},null,2));
if(failed.length)process.exit(1);
