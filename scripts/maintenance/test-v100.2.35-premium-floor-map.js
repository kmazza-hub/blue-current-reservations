"use strict";
const fs=require("fs"),path=require("path");
const root=process.cwd();
const js=fs.readFileSync(path.join(root,"client","js","app-v15.1.3.js"),"utf8");
const css=fs.readFileSync(path.join(root,"client","styles.css"),"utf8");
const checks=[
 ["V100.2.35 JS marker",js.includes("V100.2.35 — Premium Restaurant Floor Map")],
 ["V100.2.35 CSS marker",css.includes("V100.2.35 — Premium Restaurant Floor Map")],
 ["architecture layer injected",js.includes("bc-floor-architecture-v100-2-35")],
 ["main floor has host entry",js.includes("bc-main-host-v100-2-35")],
 ["main floor has bar",js.includes("bc-main-bar-v100-2-35")],
 ["waterfront has window wall",js.includes("bc-water-window-v100-2-35")],
 ["private dining has credenza",js.includes("bc-private-credenza-v100-2-35")],
 ["room-specific table positions",/data-table=\"8\"/.test(css)&&/data-table=\"22\"/.test(css)],
 ["architecture ignores pointer events",/bc-floor-architecture-v100-2-35[\s\S]*pointer-events:none/.test(css)],
 ["V100.2.34 remains present",js.includes("V100.2.34 — Zoned Host Floor Plans")]
];
const failed=checks.filter(([,ok])=>!ok).map(([n])=>n);
console.log(JSON.stringify({ok:!failed.length,version:"100.2.35",checks:checks.map(([name,ok])=>({name,ok})),failed},null,2));
if(failed.length)process.exit(1);
