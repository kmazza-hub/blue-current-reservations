"use strict";
const fs=require("fs"),path=require("path");
const root=process.cwd();
const css=fs.readFileSync(path.join(root,"client","styles.css"),"utf8");
const checks=[
 ["V100.2.38 marker installed",css.includes("V100.2.38 — Centered Table Detail + Floor Collision Polish")],
 ["neutral detail centered horizontally",/bc-neutral-table-detail-v100-2-16\.bc-detail-open[\s\S]*left:\s*50% !important/.test(css)],
 ["neutral detail centered vertically",/bc-neutral-table-detail-v100-2-16\.bc-detail-open[\s\S]*top:\s*50% !important/.test(css)],
 ["neutral detail uses center transform",/bc-neutral-table-detail-v100-2-16\.bc-detail-open[\s\S]*translate\(-50%, -50%\)/.test(css)],
 ["neutral detail remains responsive",/width:\s*min\(360px, calc\(100% - 40px\)\)/.test(css)],
 ["white card has dark readable content",css.includes("-webkit-text-fill-color: #0d3440 !important")],
 ["detail receives elevated z-index",/z-index:\s*80 !important/.test(css)],
 ["construction service path hidden",css.includes("bc-main-service-path-v100-2-37")&&/bc-main-service-path-v100-2-37[\s\S]*display:\s*none !important/.test(css)],
 ["private event construction box hidden",css.includes("bc-private-event-center-v100-2-37")],
 ["capacity label remains centered",/\.host-table::before[\s\S]*text-align:\s*center/.test(css)],
 ["V100.2.37 remains beneath polish",css.includes("V100.2.37 — World-Class Floor Map Design System")]
];
const failed=checks.filter(([,ok])=>!ok).map(([n])=>n);
console.log(JSON.stringify({ok:!failed.length,version:"100.2.38",checks:checks.map(([name,ok])=>({name,ok})),failed},null,2));
if(failed.length)process.exit(1);
