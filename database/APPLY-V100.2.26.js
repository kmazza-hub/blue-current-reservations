"use strict";
const fs = require("fs");
const path = require("path");
const root = process.cwd();
const jsPath = path.join(root,"client","js","app-v15.1.3.js");
const cssPath = path.join(root,"client","styles.css");
const jsFragPath = path.join(root,"patches","host-wait-reserved-tools-v100.2.26.jsfrag");
const cssFragPath = path.join(root,"patches","host-wait-reserved-tools-v100.2.26.cssfrag");
for (const p of [jsPath,cssPath,jsFragPath,cssFragPath]) {
  if (!fs.existsSync(p)) { console.error(`V100.2.26 apply failed: missing ${path.relative(root,p)}`); process.exit(1); }
}
let js = fs.readFileSync(jsPath,"utf8");
let css = fs.readFileSync(cssPath,"utf8");
if (!js.includes("__bcHostAdaptiveLabelsV100_2_25")) { console.error("V100.2.26 requires V100.2.25 first."); process.exit(1); }
if (js.includes("__bcHostWaitQuoteV100_2_26")) { console.log("V100.2.26 already applied."); process.exit(0); }

// Simplify the no-table message: position + one estimate, not a wall of table numbers.
const oldNoTable = `  const noTableMessage = (partySize) => {
    const next = window.__bcHostTableTrustV100_2_22?.nextFits?.(partySize,3) || [];
    const future = next.filter((item) => item.minutes > 0);
    if (!future.length) return 'No table that fits is projected yet. Keep the party in Ready to seat.';
    const summary = future.map((item) => \`Table \${item.tableNumber} ~\${Math.max(1,item.minutes)}m\`).join(' · ');
    return \`No table that fits is open. Next likely: \${summary}. Estimates only—staff confirms when a table is actually open.\`;
  };`;
const newNoTable = `  const noTableMessage = (partySize) => {
    const rows = [...waitlist.querySelectorAll('.queue-item')].filter((row) => !lower(row.textContent).includes('seated'));
    const position = Math.max(1, rows.indexOf(flow.row) + 1);
    const quoteApi = window.__bcHostWaitQuoteV100_2_26;
    const estimate = quoteApi?.forParty?.(partySize, position);
    if (Number.isFinite(estimate)) {
      const ahead = Math.max(0, position - 1);
      const place = ahead === 0 ? 'Next in line' : \`\${ahead} part\${ahead===1?'y':'ies'} ahead\`;
      return estimate <= 0 ? \`\${place} · waiting for staff table confirmation.\` : \`\${place} · estimated seat ~\${estimate} min. Staff confirms when the table is ready.\`;
    }
    const next = window.__bcHostTableTrustV100_2_22?.nextFits?.(partySize,1) || [];
    return next[0] ? \`Estimated seat ~\${Math.max(5,Math.ceil(Number(next[0].minutes||0)/5)*5)} min. Staff confirmation required.\` : 'No matching table estimate yet. Keep waiting.';
  };`;
if (js.includes(oldNoTable)) js = js.replace(oldNoTable,newNoTable);
else console.warn("V100.2.26: no-table message anchor differed; reserved-table and wait-quote tools will still install.");

const jsFrag = fs.readFileSync(jsFragPath,"utf8").trim();
const cssFrag = fs.readFileSync(cssFragPath,"utf8").trim();
fs.writeFileSync(jsPath+".v100.2.26.bak",fs.readFileSync(jsPath,"utf8"));
fs.writeFileSync(cssPath+".v100.2.26.bak",fs.readFileSync(cssPath,"utf8"));
fs.writeFileSync(jsPath,js+"\n\n"+jsFrag+"\n");
fs.writeFileSync(cssPath,css+"\n\n"+cssFrag+"\n");
console.log(JSON.stringify({
  ok:true,version:"100.2.26",repair:"Dynamic Wait Quote + Functional Reserved Table Tools",
  fixes:[
    "add one current wait quote that changes with queue pressure and predicted table availability",
    "calculate position-aware estimated seating time without crowding every waitlist card",
    "replace long no-table explanations with queue position plus one actionable estimate",
    "reserved tables open a functional guest-linking tool instead of a dead detail card",
    "link an expected arrival or ready-to-seat guest to a reserved table",
    "seat a linked ready guest directly into the reserved table",
    "mark a linked expected reservation arrived from the reserved-table tool",
    "release an unused reserved table back to available inventory",
    "reserved-table tool closes cleanly and suppresses the legacy dead card"
  ]
},null,2));
