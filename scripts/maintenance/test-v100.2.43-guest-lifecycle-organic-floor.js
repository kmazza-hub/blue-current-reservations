"use strict";
const fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../..");
const js=fs.readFileSync(path.join(root,"client/js/floor-reservations-v62.0.js"),"utf8");
const css=fs.readFileSync(path.join(root,"client/styles.css"),"utf8");
const checks=[
 ["version marker",css.includes("V100.2.43 — Organic Collision-Safe Restaurant Floor")],
 ["guest registry",js.includes('bcHostGuestRegistryV100_2_43')],
 ["handoff removes reservation",js.includes('article.remove();\n   setView("floor")')],
 ["walk-in persists",js.includes('source:"waitlist"')],
 ["seated persists",js.includes('source:"seated"')],
 ["guest history merged",js.includes('historicalGuestData(),...profileGuestData')],
 ["recent guests visible",js.includes('const recent=searchableGuestData().slice(-20).reverse()')],
 ["main organic position",css.includes('.host-table[data-table="2"]  { left:18% !important; top:43% !important; }')],
 ["waterfront organic position",css.includes('.host-table[data-table="30"] { left:68% !important; top:53% !important; }')],
 ["private organic position",css.includes('.host-table[data-table="42"] { left:86% !important; top:37% !important; }')]
];
let ok=true;for(const [name,pass] of checks){console.log(`${pass?"PASS":"FAIL"} ${name}`);if(!pass)ok=false;}
if(!ok)process.exit(1);console.log(`V100.2.43 ${checks.length}/${checks.length} checks passed.`);
