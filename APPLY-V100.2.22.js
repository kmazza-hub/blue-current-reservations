"use strict";
const fs = require("fs");
const path = require("path");
const root = process.cwd();
const jsPath = path.join(root,"client","js","app-v15.1.3.js");
const cssPath = path.join(root,"client","styles.css");
const jsFragPath = path.join(root,"patches","host-table-trust-v100.2.22.jsfrag");
const cssFragPath = path.join(root,"patches","host-table-trust-v100.2.22.cssfrag");
for (const p of [jsPath,cssPath,jsFragPath,cssFragPath]) {
  if (!fs.existsSync(p)) { console.error(`V100.2.22 apply failed: missing ${path.relative(root,p)}`); process.exit(1); }
}
let js = fs.readFileSync(jsPath,"utf8");
let css = fs.readFileSync(cssPath,"utf8");
if (!js.includes("__bcHostRuntimeRecoveryV100_2_20")) { console.error("V100.2.22 requires the V100.2.20 recovered Host Stand runtime."); process.exit(1); }
if (!css.includes("V100.2.21 — Host Stand Contrast Hardening")) { console.error("V100.2.22 requires V100.2.21 contrast hardening first."); process.exit(1); }
if (js.includes("__bcHostTableTrustV100_2_22")) { console.log("V100.2.22 already applied."); process.exit(0); }
function replaceBetween(source,startMarker,endMarker,replacement,label){
  const start=source.indexOf(startMarker);
  if(start<0){ console.error(`V100.2.22 refused: ${label} start marker not found.`); process.exit(1); }
  const end=source.indexOf(endMarker,start);
  if(end<0){ console.error(`V100.2.22 refused: ${label} end marker not found.`); process.exit(1); }
  return source.slice(0,start)+replacement+source.slice(end);
}
const beginReplacement = "  const partySizeFrom = (detail) => Number(String(detail || '').match(/party\\s+of\\s+(\\d+)/i)?.[1] || 1);\n  const demoCapacities = { '2':2, '4':4, '6':4, '8':4, '14':4, '16':4, '18':2, '20':4, '22':4 };\n  const capacityOf = (table) => Number(table?.dataset?.capacity || demoCapacities[tableNumber(table)] || 4);\n  const eligibleFor = (table, partySize) => tableState(table) === 'available' && capacityOf(table) >= partySize;\n  const noTableMessage = (partySize) => {\n    const next = window.__bcHostTableTrustV100_2_22?.nextFits?.(partySize,3) || [];\n    const future = next.filter((item) => item.minutes > 0);\n    if (!future.length) return 'No table that fits is projected yet. Keep the party in Ready to seat.';\n    const summary = future.map((item) => `Table ${item.tableNumber} ~${Math.max(1,item.minutes)}m`).join(' \u00b7 ');\n    return `No table that fits is open. Next likely: ${summary}. Estimates only\u2014staff confirms when a table is actually open.`;\n  };\n\n  const begin = (row) => {\n    const guestName = normalize(row.querySelector('strong')?.textContent) || 'Guest';\n    const guestDetail = normalize(row.querySelector('small')?.textContent) || normalize(row.textContent).replace(guestName,'').replace(/\\bSeat\\b/ig,'').trim() || 'Ready to seat';\n    const partySize = partySizeFrom(guestDetail);\n    cancel();\n    flow.row = row; flow.guestName = guestName; flow.guestDetail = guestDetail; flow.partySize = partySize; flow.selectedTable = null;\n    if (floorNav && (floorPanel.hidden || getComputedStyle(floorPanel).display === 'none')) floorNav.click();\n    clearLegacyFlowState();\n    const eligible = tables().filter((table) => eligibleFor(table,partySize));\n    instruction.querySelector('strong').textContent = eligible.length ? `Choose a table for ${guestName}` : `No table open for ${guestName}`;\n    instruction.querySelector('span').textContent = eligible.length ? `${guestDetail} \u00b7 Tap one highlighted table that fits.` : noTableMessage(partySize);\n    const cancelButton = instruction.querySelector('.bc-unified-cancel-v100-2-18');\n    if (cancelButton) cancelButton.textContent = eligible.length ? 'Cancel' : 'Keep waiting';\n    instruction.hidden = false;\n    confirm.hidden = true;\n    flow.active = eligible.length > 0;\n    tables().forEach((table) => {\n      const allowed = eligibleFor(table,partySize);\n      table.classList.toggle('bc-unified-seat-choice-v100-2-18', allowed);\n      table.classList.toggle('bc-unified-seat-unavailable-v100-2-18', !allowed);\n    });\n  };\n\n";
js = replaceBetween(js,"  const begin = (row) => {","  const choose = (table) => {",beginReplacement,"unified seating begin");
const chooseReplacement = "  const choose = (table) => {\n    if (!flow.active || !flow.row) return;\n    if (!eligibleFor(table, Number(flow.partySize || 1))) return;\n    flow.selectedTable = table;\n    tables().forEach((item) => item.classList.toggle('selected', item === table));\n    const num = tableNumber(table);\n    confirm.querySelector('strong').textContent = `Seat ${flow.guestName} at Table ${num}`;\n    confirm.querySelector('p').textContent = `${flow.guestDetail} \u00b7 Table ${num} is OPEN and fits this party.`;\n    confirm.querySelector('.bc-unified-confirm-v100-2-18').textContent = `Seat ${flow.guestName.split(' ')[0]} at Table ${num}`;\n    confirm.hidden = false;\n  };\n\n";
js = replaceBetween(js,"  const choose = (table) => {","  const statusNode = (row) =>",chooseReplacement,"unified seating choose");
const oldSeatWrite = "    const small = table.querySelector('small');\n    if (small) small.textContent = 'Seated';";
const newSeatWrite = "    const small = table.querySelector('small');\n    if (small) small.textContent = 'SEATED · 0m';\n    table.dataset.bcSeatedAt = String(Date.now());\n    table.dataset.bcPartySize = String(Number(flow.partySize || 1));\n    window.__bcHostTableTrustV100_2_22?.markSeated?.(table, flow.partySize, guestName);";
if (!js.includes(oldSeatWrite)) { console.error("V100.2.22 refused: recovered seating completion block differs from expected source."); process.exit(1); }
js = js.replace(oldSeatWrite,newSeatWrite);
const insertMarker = "window.__bcHostRuntimeRecoveryV100_2_20 = { ok:true, observer:'guarded', seatingOwner:'unified' };";
const pos = js.indexOf(insertMarker);
if (pos<0) { console.error("V100.2.22 refused: recovery insertion marker missing."); process.exit(1); }
const insertion = pos + insertMarker.length;
const jsFrag = fs.readFileSync(jsFragPath,"utf8").trim();
js = js.slice(0,insertion)+"\n\n"+jsFrag+"\n"+js.slice(insertion);
const cssFrag = fs.readFileSync(cssFragPath,"utf8").trim();
fs.writeFileSync(jsPath+".v100.2.22.bak",fs.readFileSync(jsPath,"utf8"));
fs.writeFileSync(cssPath+".v100.2.22.bak",fs.readFileSync(cssPath,"utf8"));
fs.writeFileSync(jsPath,js);
fs.writeFileSync(cssPath,css+"\n\n"+cssFrag+"\n");
console.log(JSON.stringify({
  ok:true,version:"100.2.22",repair:"Trustworthy Table Lifecycle + Predictive Availability",
  fixes:["high-contrast unified seating card and cancel actions","explicit table status labels instead of ambiguous raw times","party-size-aware table choices","no dead-end chooser when no table fits","manual Party left -> Cleaning -> Mark table open lifecycle","predictions remain advisory until staff confirms table open"]
},null,2));
