"use strict";
const fs=require("fs"),path=require("path");
const f=path.join(process.cwd(),"client","styles.css");
if(!fs.existsSync(f)){console.error("FAIL styles.css missing");process.exit(1)}
const s=fs.readFileSync(f,"utf8");
const checks=[
 ["version marker",s.includes("V100.2.21 — Host Stand Contrast Hardening")],
 ["instruction high contrast",s.includes("background:#0b4653 !important")],
 ["cancel dark text",s.includes("color:#092e39 !important")],
 ["confirmation white",s.includes(".bc-waitlist-seat-confirm-v100-2-15")&&s.includes("background:#ffffff !important")],
 ["confirmation copy",s.includes("color:#244f5a !important")],
 ["primary seat action",s.includes("background:#087694 !important")],
 ["table highlight",s.includes("outline-color:#39d6c1 !important")],
 ["unavailable fade",s.includes("opacity:.34 !important")],
 ["ready source chip",s.includes(".bc-ready-source-v100-2-17")],
 ["priority chip",s.includes(".bc-ready-priority-v100-2-17")]
];
const failed=checks.filter(([,ok])=>!ok);
console.log(JSON.stringify({ok:failed.length===0,version:"100.2.21",checks:checks.map(([name,ok])=>({name,ok})),failed:failed.map(([name])=>name)},null,2));
if(failed.length)process.exit(1);
