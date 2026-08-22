"use strict";
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
const jsRoot = path.join(root, "client", "js");
const cssPath = path.join(root, "client", "styles.css");
const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (p.endsWith(".js")) files.push(p);
  }
})(jsRoot);

const source = files.map((f) => fs.readFileSync(f, "utf8")).join("\n");
const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, "utf8") : "";
const checks = [
  ["V100.2.10 assigned state preserved", source.includes('button.dataset.bcAssignmentState = "assigned"')],
  ["V100.2.10 seated state preserved", source.includes('button.dataset.bcAssignmentState = "seated"')],
  ["seat completion hides detail", source.includes("setDetailVisibility(false)")],
  ["hidden state is semantic", source.includes('detail.setAttribute("aria-hidden", "true")')],
  ["reopen listener is guarded", source.includes("__bcSeatedTableDetailReopenV100_2_11")],
  ["table click reopens detail", source.includes("detail.hidden = false")],
  ["reopen clears aria-hidden", source.includes('detail.removeAttribute("aria-hidden")')],
  ["seated guest remains on table", source.includes('table.dataset.bcGuestStatus = "seated"')],
  ["seated guest identity remains on table", source.includes("table.dataset.bcGuestName = guestName")],
  ["arrival still gets table location", source.includes("arrival.dataset.bcTable = tableNumber")],
  ["stale CTA remains removed", source.includes("button.hidden = true") && source.includes("button.disabled = true")],
  ["CSS guarantees hidden card is gone", css.includes("#hostTableDetail[hidden]") && css.includes("display: none !important")]
];
const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
console.log(JSON.stringify({
  ok: failed.length === 0,
  repair: "V100.2.11 Seated Table Detail Auto-Collapse",
  baselineVersion: "100.0.0",
  checks: checks.map(([name, ok]) => ({ name, ok })),
  failed
}, null, 2));
if (failed.length) process.exit(1);
