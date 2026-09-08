"use strict";
const fs = require("fs");
const path = require("path");
const root = process.cwd();
const jsPath = path.join(root,"client","js","app-v15.1.3.js");
const cssPath = path.join(root,"client","styles.css");
const cssFragPath = path.join(root,"patches","host-service-funnel-v100.2.24.cssfrag");
for (const p of [jsPath,cssPath,cssFragPath]) {
  if (!fs.existsSync(p)) { console.error(`V100.2.24 apply failed: missing ${path.relative(root,p)}`); process.exit(1); }
}
let js = fs.readFileSync(jsPath,"utf8");
let css = fs.readFileSync(cssPath,"utf8");
if (!js.includes("__bcHostGlanceModeV100_2_23")) { console.error("V100.2.24 requires V100.2.23 first."); process.exit(1); }
if (js.includes("__bcHostServiceFunnelV100_2_24")) { console.log("V100.2.24 already applied."); process.exit(0); }

/* Preserve provenance in row datasets while removing the DOM pill itself. This fixes the V100.2.23 selector mismatch
   and prevents future observer maintenance from recreating visible source chrome. */
const decorateStart = "  const decorateReadyRow = (row, sourceType='walk-in') => {";
const decorateEnd = "  const buildReadyRow = (sourceRow) => {";
const start = js.indexOf(decorateStart);
const end = js.indexOf(decorateEnd,start);
if (start < 0 || end < 0) { console.error("V100.2.24 refused: ready-row decoration block not found."); process.exit(1); }
const replacement = [
  "  const decorateReadyRow = (row, sourceType='walk-in') => {",
  "    row.dataset.bcSourceType = sourceType;",
  "    const content = row.querySelector('div');",
  "    // Provenance remains in data/history, never as rush-screen chrome.",
  "    content?.querySelectorAll('.bc-ready-seat-source-v100-2-17, .bc-ready-source-v100-2-17').forEach((node) => node.remove());",
  "    const label = specialLabelFor(row.textContent);",
  "    if (label && content && !content.querySelector('.bc-special-badge-v100-2-17')) {",
  "      row.classList.add('bc-special-priority-v100-2-17');",
  "      const badge = document.createElement('span');",
  "      badge.className = 'bc-special-badge-v100-2-17';",
  "      badge.textContent = label;",
  "      content.appendChild(badge);",
  "    }",
  "  };",
  "",
].join("\n");
js = js.slice(0,start) + replacement + js.slice(end);

const apiMarker = "  window.__bcHostGlanceModeV100_2_23 = { ok:true, motto:'aim small miss small', floor:'glance', queue:'decision-only' };";
if (!js.includes(apiMarker)) { console.error("V100.2.24 refused: V100.2.23 API marker missing."); process.exit(1); }
js = js.replace(apiMarker, apiMarker + "\n  window.__bcHostServiceFunnelV100_2_24 = { ok:true, motto:'aim small miss small', waitlist:'name-party-wait-need-action', arrivals:'near-term-action-queue', scale:'bounded-scroll' };" );

const cssFrag = fs.readFileSync(cssFragPath,"utf8").trim();
fs.writeFileSync(jsPath+".v100.2.24.bak",fs.readFileSync(jsPath,"utf8"));
fs.writeFileSync(cssPath+".v100.2.24.bak",fs.readFileSync(cssPath,"utf8"));
fs.writeFileSync(jsPath,js);
fs.writeFileSync(cssPath,css+"\n\n"+cssFrag+"\n");
console.log(JSON.stringify({
  ok:true,version:"100.2.24",repair:"Host Stand Scalable Service Funnel",
  fixes:[
    "remove reservation/walk-in provenance pills from ready-to-seat cards while retaining sourceType data",
    "compact Waitlist into name, party, wait, one important need, and Seat",
    "compact Arrivals into time, guest, party context, and Mark arrived",
    "bound high-volume side queues with independent scrolling instead of shrinking text",
    "keep full reservation history/book in Reservations rather than crowding the live funnel",
    "preserve special occasions and operational needs as the only priority chrome"
  ]
},null,2));
