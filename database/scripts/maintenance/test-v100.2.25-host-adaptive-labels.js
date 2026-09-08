"use strict";
const fs = require("fs");
const path = require("path");
const root = process.cwd();
const js = fs.readFileSync(path.join(root,"client","js","app-v15.1.3.js"),"utf8");
const css = fs.readFileSync(path.join(root,"client","styles.css"),"utf8");
const checks = [
  ["V100.2.25 marker installed", js.includes("__bcHostAdaptiveLabelsV100_2_25")],
  ["V100.2.24 prerequisite retained", js.includes("__bcHostServiceFunnelV100_2_24")],
  ["adaptive table width enabled", css.includes("width:max-content !important")],
  ["table markers have protective max width", css.includes("max-width:104px !important")],
  ["table labels centered", css.includes("text-align:center !important")],
  ["round markers adapt to content", css.includes("#host-stand .host-table.round") && css.includes("border-radius:999px !important")],
  ["long glance states receive extra width", css.includes("bc-open-soon-v100-2-23")],
  ["priority pills use inline flex", css.includes("display:inline-flex !important")],
  ["priority pills vertically center", css.includes("align-items:center !important")],
  ["provenance stays hidden", css.includes("Do not resurrect provenance pills hidden by V100.2.24")],
];
const failed = checks.filter(([,ok])=>!ok).map(([name])=>name);
console.log(JSON.stringify({ok:failed.length===0,version:"100.2.25",checks:checks.map(([name,ok])=>({name,ok})),failed},null,2));
if (failed.length) process.exit(1);
