"use strict";
const fs = require("fs");
const path = require("path");
const root = process.cwd();
const jsPath = path.join(root,"client","js","app-v15.1.3.js");
const cssPath = path.join(root,"client","styles.css");
const cssFragPath = path.join(root,"patches","host-glance-mode-v100.2.23.cssfrag");
for (const p of [jsPath,cssPath,cssFragPath]) {
  if (!fs.existsSync(p)) { console.error(`V100.2.23 apply failed: missing ${path.relative(root,p)}`); process.exit(1); }
}
let js = fs.readFileSync(jsPath,"utf8");
let css = fs.readFileSync(cssPath,"utf8");
if (!js.includes("__bcHostTableTrustV100_2_22")) { console.error("V100.2.23 requires V100.2.22 first."); process.exit(1); }
if (js.includes("__bcHostGlanceModeV100_2_23")) { console.log("V100.2.23 already applied."); process.exit(0); }
function replaceBetween(source,startMarker,endMarker,replacement,label){
  const start=source.indexOf(startMarker);
  if(start<0){ console.error(`V100.2.23 refused: ${label} start marker not found.`); process.exit(1); }
  const end=source.indexOf(endMarker,start);
  if(end<0){ console.error(`V100.2.23 refused: ${label} end marker not found.`); process.exit(1); }
  return source.slice(0,start)+replacement+source.slice(end);
}
const renderReplacement = [
  "  const renderTable = (table) => {",
  "    seedTable(table);",
  "    const small = table.querySelector('small');",
  "    if (!small) return;",
  "    const state = stateOf(table);",
  "    if (state === 'available') {",
  "      small.textContent = 'OPEN';",
  "      table.dataset.bcOperationalLabel = 'Open now';",
  "      return;",
  "    }",
  "    if (state === 'reserved') {",
  "      const label = table.dataset.bcReservationLabel || 'Held';",
  "      small.textContent = /^\\d{1,2}:\\d{2}$/.test(label) ? label : 'RESERVED';",
  "      table.dataset.bcOperationalLabel = `Reserved ${label}`.trim();",
  "      return;",
  "    }",
  "    if (state === 'cleaning') {",
  "      const elapsed = minsSince(table.dataset.bcCleaningAt);",
  "      small.textContent = elapsed >= 10 ? 'CHECK' : 'CLEANING';",
  "      table.dataset.bcOperationalLabel = elapsed >= 10 ? `Cleaning ${elapsed} minutes, check table` : `Cleaning ${elapsed} minutes`;",
  "      return;",
  "    }",
  "    if (state === 'seated') {",
  "      const elapsed = minsSince(table.dataset.bcSeatedAt);",
  "      const remaining = remainingFor(table);",
  "      if (remaining <= 0) {",
  "        small.textContent = 'CHECK';",
  "        table.dataset.bcOperationalLabel = `Seated ${elapsed} minutes, check table`;",
  "      } else if (remaining <= 15) {",
  "        small.textContent = 'OPEN SOON';",
  "        table.dataset.bcOperationalLabel = `Likely open in about ${clamp(Math.ceil(remaining/5)*5,5,15)} minutes`;",
  "      } else {",
  "        small.textContent = 'SEATED';",
  "        table.dataset.bcOperationalLabel = `Seated ${elapsed} minutes`;",
  "      }",
  "    }",
  "  };",
  "",
].join("\n");
js = replaceBetween(js,"  const renderTable = (table) => {","  const renderAll = () => {",renderReplacement,"table glance renderer");
const marker = "  window.__bcHostTableTrustV100_2_22 = api;";
if (!js.includes(marker)) { console.error("V100.2.23 refused: V100.2.22 API marker missing."); process.exit(1); }
js = js.replace(marker, marker + "\n  window.__bcHostGlanceModeV100_2_23 = { ok:true, motto:'aim small miss small', floor:'glance', queue:'decision-only' };");
const cssFrag = fs.readFileSync(cssFragPath,"utf8").trim();
fs.writeFileSync(jsPath+".v100.2.23.bak",fs.readFileSync(jsPath,"utf8"));
fs.writeFileSync(cssPath+".v100.2.23.bak",fs.readFileSync(cssPath,"utf8"));
fs.writeFileSync(jsPath,js);
fs.writeFileSync(cssPath,css+"\n\n"+cssFrag+"\n");
console.log(JSON.stringify({
  ok:true,version:"100.2.23",repair:"Host Stand Glance Mode",
  fixes:[
    "hide reservation/walk-in provenance from ready-to-seat cards while preserving underlying data",
    "floor tiles show only actionable state: OPEN, SEATED, OPEN SOON, CHECK, CLEANING, or reservation time",
    "elapsed and predictive timing remain available in table detail instead of cluttering the map",
    "cleaning only escalates to CHECK when unusually long",
    "reinforce seating-card and cancel contrast"
  ]
},null,2));
