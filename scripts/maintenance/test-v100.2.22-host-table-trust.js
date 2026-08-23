"use strict";
const fs = require("fs");
const path = require("path");
const root = process.cwd();
const jsPath = path.join(root,"client","js","app-v15.1.3.js");
const cssPath = path.join(root,"client","styles.css");
const js = fs.readFileSync(jsPath,"utf8");
const css = fs.readFileSync(cssPath,"utf8");
const checks = [
  ["table trust runtime installed", js.includes("__bcHostTableTrustV100_2_22")],
  ["unified seating still recovered", js.includes("__bcHostRuntimeRecoveryV100_2_20")],
  ["party size parsed for table fit", js.includes("const partySizeFrom = (detail)")],
  ["seat choices require available state", js.includes("tableState(table) === 'available' && capacityOf(table) >= partySize")],
  ["no-table state exists", js.includes("No table that fits is open. Next likely:")],
  ["predictions explicitly advisory", js.includes("Estimates only—staff confirms when a table is actually open")],
  ["seated elapsed label exists", js.includes("SEATED · ${elapsed}m")],
  ["open-soon estimate exists", js.includes("OPEN ~${clamp")],
  ["check-table state exists", js.includes("CHECK TABLE")],
  ["cleaning state exists", js.includes("CLEANING · ${elapsed}m")],
  ["party left manual action exists", js.includes("Party left")],
  ["mark table open manual action exists", js.includes("Mark table open")],
  ["manual open guard copy exists", js.includes("will not mark this table open automatically")],
  ["new seating records seated timestamp", js.includes("table.dataset.bcSeatedAt = String(Date.now())")],
  ["unified card contrast hardened", css.includes("#host-stand .bc-unified-seat-confirm-v100-2-18") && css.includes("color:#082f3a !important")],
  ["lifecycle card contrast hardened", css.includes("bc-table-lifecycle-card-v100-2-22") && css.includes("background:#fff")]
];
const failed = checks.filter(([,ok])=>!ok).map(([name])=>name);
console.log(JSON.stringify({ok:failed.length===0,repair:"V100.2.22 Host Table Trust",checks:checks.map(([name,ok])=>({name,ok})),failed},null,2));
if(failed.length) process.exit(1);
