"use strict";
const fs = require("fs");
const path = require("path");
const root = process.cwd();
const cssPath = path.join(root,"client","styles.css");
const css = fs.readFileSync(cssPath,"utf8");
const checks = [
  ["repair marker installed", css.includes("V100.2.29 — Surgical Host Action Repair")],
  ["unified confirm card restored white", /bc-unified-seat-confirm-v100-2-18[\s\S]*background:#ffffff !important/.test(css)],
  ["actual unified confirm button targeted", css.includes(".bc-unified-seat-confirm-v100-2-18 .bc-unified-confirm-v100-2-18")],
  ["cancel uses dark text", /bc-unified-cancel-v100-2-18[\s\S]*color:#15333b !important/.test(css)],
  ["queue seat buttons bounded", /#waitlistQueue \.queue-item > button[\s\S]*max-width:92px !important/.test(css)],
  ["queue button text white", /#waitlistQueue \.queue-item > button[\s\S]*-webkit-text-fill-color:#ffffff !important/.test(css)],
  ["waitlist grid restored", css.includes("grid-template-columns:46px minmax(118px,1fr) 92px !important")],
  ["reserved-table rules remain scoped", css.includes("#host-stand .bc-reserved-table-tool-v100-2-26")],
  ["no JavaScript workflow patch in V100.2.29", !fs.existsSync(path.join(root,"patches","surgical-host-action-repair-v100.2.29.jsfrag"))],
  ["V100.2.28 remains present beneath repair", css.includes("V100.2.28 — Host Action Card Readability + Seat Button Contrast")]
];
const failed = checks.filter(([,ok])=>!ok).map(([name])=>name);
console.log(JSON.stringify({ok:failed.length===0,version:"100.2.29",checks:checks.map(([name,ok])=>({name,ok})),failed},null,2));
if (failed.length) process.exit(1);
