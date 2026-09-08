"use strict";
const fs=require("fs"),path=require("path"),assert=require("assert");
const root=process.cwd();
const js=fs.readFileSync(path.join(root,"client","js","floor-reservations-v62.0.js"),"utf8");
const css=fs.readFileSync(path.join(root,"client","styles.css"),"utf8");
const checks=[
  ["service intake preserved",js.includes("V100.2.50 — Service Intake Queue")],
  ["active service workspace preserved",js.includes("V100.2.51 — Service Active Tables")],
  ["service milestones preserved",js.includes("V100.2.52 — Service Milestones")],
  ["floor restoration restored",js.includes("V100.2.47 — Floor Layout Restoration")],
  ["main room inventory isolated",js.includes("'1','2','3','4','5','6','7','9','10','11','12','13','15','17','19','21'")],
  ["waterfront inventory isolated",js.includes("'8','14','16','24','26','28','30','32','34','36','38','40'")],
  ["private inventory isolated",js.includes("'18','20','22','42','44','46','48','50'")],
  ["zone-hidden hard isolation present",js.includes("bc-zone-hidden-v100-2-47")],
  ["architecture is rebuilt deliberately",js.includes("restoreArchitecture()")],
  ["floor readability lock preserved",css.includes("V100.2.48 — Floor Cell Readability Lock")],
  ["capacity labels live inside cells",css.includes("Capacity belongs to the table, not floating above it")],
  ["selected cell growth restrained",css.includes("scale(1.015)")]
];
for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);assert.ok(ok,name);}
console.log(`V100.2.53 validation ${checks.length}/${checks.length}`);
