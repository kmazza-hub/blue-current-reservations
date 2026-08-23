"use strict";
const fs = require("fs");
const path = require("path");
const root = process.cwd();
const css = fs.readFileSync(path.join(root,"client","styles.css"),"utf8");
const checks = [
  ["V100.2.31 marker installed", css.includes("V100.2.31 — Arrival Mark Arrived Fit")],
  ["redundant Expected pill hidden", /#host-stand #arrivalQueue \.queue-item\.arrival \.arrival-chip\.pending[\s\S]*display:none !important/.test(css)],
  ["arrival row uses three-column contract", /grid-template-columns:54px minmax\(0,1fr\) 108px !important/.test(css)],
  ["Mark arrived owns third column", /#host-stand #arrivalQueue \.bc-mark-arrived-v100-2-17[\s\S]*grid-column:3 !important/.test(css)],
  ["Mark arrived desktop width is 108px", /bc-mark-arrived-v100-2-17[\s\S]*width:108px !important/.test(css)],
  ["Mark arrived remains one line", /bc-mark-arrived-v100-2-17[\s\S]*white-space:nowrap !important/.test(css)],
  ["Mark arrived text stays white", /bc-mark-arrived-v100-2-17[\s\S]*-webkit-text-fill-color:#ffffff !important/.test(css)],
  ["arrival scrollbar gutter added", /#host-stand #arrivalQueue[\s\S]*padding-right:8px !important/.test(css)],
  ["tablet action remains at least 104px", /@media \(max-width:1100px\)[\s\S]*width:104px !important/.test(css)],
  ["V100.2.30 remains beneath repair", css.includes("V100.2.30 — Waitlist Seat Button Fit")]
];
const failed = checks.filter(([,ok])=>!ok).map(([name])=>name);
console.log(JSON.stringify({ok:failed.length===0,version:"100.2.31",checks:checks.map(([name,ok])=>({name,ok})),failed},null,2));
if (failed.length) process.exit(1);
