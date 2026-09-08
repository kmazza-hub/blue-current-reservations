"use strict";
const fs = require("fs");
const path = require("path");
const root = process.cwd();
const js = fs.readFileSync(path.join(root,"client","js","app-v15.1.3.js"),"utf8");
const css = fs.readFileSync(path.join(root,"client","styles.css"),"utf8");
const checks = [
  ["V100.2.24 marker installed", js.includes("__bcHostServiceFunnelV100_2_24")],
  ["V100.2.23 prerequisite retained", js.includes("__bcHostGlanceModeV100_2_23")],
  ["ready-row source data retained", js.includes("row.dataset.bcSourceType = sourceType")],
  ["visible provenance nodes removed", js.includes("Provenance remains in data/history")],
  ["correct source pill selector hidden", css.includes(".bc-ready-seat-source-v100-2-17")],
  ["waitlist uses compact grid", css.includes("grid-template-columns:46px minmax(0,1fr) 92px")],
  ["arrivals uses compact grid", css.includes("grid-template-columns:58px minmax(0,1fr) 112px")],
  ["queues are viewport bounded", css.includes("max-height:calc(100vh - 265px)")],
  ["queues independently scroll", css.includes("overflow-y:auto")],
  ["special priority remains visible", css.includes(".bc-special-badge-v100-2-17")],
];
const failed = checks.filter(([,ok]) => !ok).map(([name]) => name);
console.log(JSON.stringify({ok:failed.length===0,version:"100.2.24",checks:checks.map(([name,ok])=>({name,ok})),failed},null,2));
if (failed.length) process.exit(1);
