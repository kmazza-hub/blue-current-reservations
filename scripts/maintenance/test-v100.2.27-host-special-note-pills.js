"use strict";
const fs = require("fs");
const path = require("path");
const root = process.cwd();
const css = fs.readFileSync(path.join(root,"client","styles.css"),"utf8");
const js = fs.readFileSync(path.join(root,"client","js","app-v15.1.3.js"),"utf8");
const checks = [
  ["V100.2.26 baseline present", js.includes("__bcHostWaitQuoteV100_2_26")],
  ["V100.2.27 CSS present", css.includes("V100.2.27 — Host Stand Special Note Pill Polish")],
  ["priority pills use max-content width", css.includes("min-width:max-content !important")],
  ["priority pills remove inherited max width", css.includes("max-width:none !important")],
  ["priority pills center content", css.includes("justify-content:center !important")],
  ["priority pills prevent spill", css.includes("overflow:hidden !important")],
  ["queue content allows adaptive pill", css.includes("overflow:visible !important")],
  ["waitlist reserves note width", css.includes("minmax(118px,1fr)")],
  ["tablet layout reserves note width", css.includes("minmax(108px,1fr)")],
  ["no provenance pills reintroduced", !css.includes("display:inline-flex !important; /* provenance */")]
];
const failed = checks.filter(([,ok])=>!ok);
console.log(JSON.stringify({ok:failed.length===0,repair:"V100.2.27 Host Stand Special Note Pill Polish",checks:checks.map(([name,ok])=>({name,ok})),failed:failed.map(([name])=>name)},null,2));
if (failed.length) process.exit(1);
