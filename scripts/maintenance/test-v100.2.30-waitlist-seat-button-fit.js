"use strict";
const fs = require("fs");
const path = require("path");
const root = process.cwd();
const css = fs.readFileSync(path.join(root,"client","styles.css"),"utf8");
const checks = [
  ["V100.2.30 marker installed", css.includes("V100.2.30 — Waitlist Seat Button Fit")],
  ["waitlist middle column can shrink", /grid-template-columns:44px minmax\(0,1fr\) 76px !important/.test(css)],
  ["waitlist rows bounded to rail", /#host-stand #waitlistQueue \.queue-item[\s\S]*max-width:100% !important/.test(css)],
  ["Seat desktop width bounded", /queue-item > button[\s\S]*width:76px !important/.test(css)],
  ["Seat text remains white", /queue-item > button[\s\S]*-webkit-text-fill-color:#ffffff !important/.test(css)],
  ["scrollbar gutter added", /#host-stand #waitlistQueue[\s\S]*padding-right:8px !important/.test(css)],
  ["priority pill cannot widen grid", /bc-ready-priority-v100-2-17[\s\S]*max-width:100% !important/.test(css)],
  ["tablet action width is 72px", /@media \(max-width:1100px\)[\s\S]*max-width:72px !important/.test(css)],
  ["V100.2.29 remains beneath repair", css.includes("V100.2.29 — Surgical Host Action Repair")],
  ["visual-only patch", !fs.existsSync(path.join(root,"patches","waitlist-seat-button-fit-v100.2.30.jsfrag"))]
];
const failed = checks.filter(([,ok])=>!ok).map(([name])=>name);
console.log(JSON.stringify({ok:failed.length===0,version:"100.2.30",checks:checks.map(([name,ok])=>({name,ok})),failed},null,2));
if (failed.length) process.exit(1);
