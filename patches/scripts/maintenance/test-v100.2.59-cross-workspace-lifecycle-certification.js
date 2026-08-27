"use strict";
const fs=require("fs"),path=require("path");
const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),"utf8");
const floor=read("client/js/floor-reservations-v62.0.js");
const life=read("client/js/service-table-lifecycle-v100.2.57.js");
const turn=read("client/js/completed-visit-turn-certification-v100.2.58.js");
const app=read("client/js/app-v15.1.3.js");
const html=read("client/index.html");
const checks=[
 ["waitlist seat emits authoritative handoff",/bc:host-guest-seated/.test(floor)],
 ["service accepts host handoff",/acceptServiceHandoff/.test(floor)],
 ["service completion API exists",/complete:\(match\)=>/.test(floor)],
 ["completion refuses release when lifecycle bridge fails",/if\(!result\?\.ok\)return result/.test(floor)],
 ["service completion emits completed party",/bc:service-party-completed/.test(floor)],
 ["seated table intake requires seated state",/stateOf\(table\)\s*!==\s*"seated"/.test(life)],
 ["service intake requires guest identity",/bcGuestName/.test(life)],
 ["service intake carries authoritative table identity",/tableId/.test(life)],
 ["completion rejects missing table identity",/missing-table-identity/.test(life)],
 ["completion rejects missing table",/table-not-found/.test(life)],
 ["completion rejects wrong table state",/table-is-\$\{before\}/.test(life)],
 ["completion rejects guest-table mismatch",/guest-table-mismatch/.test(life)],
 ["completion moves table to cleaning",/classList\.add\("cleaning"\)/.test(life)],
 ["completion emits cleaning ownership event",/bc:host-table-cleaning/.test(life)],
 ["guest memory listens only after service completion",/bc:service-party-completed/.test(turn)],
 ["guest memory records completed-service source",/source:"completed-service"/.test(turn)],
 ["guest memory deduplicates completion id",/completionId/.test(turn)&&/some\(\(visit\).*completionId/.test(turn)],
 ["turn ledger begins in cleaning",/status:"cleaning"/.test(turn)],
 ["open certification requires cleaning→available",/before === "cleaning" && after === "available"/.test(turn)],
 ["open certification clears stale party ownership",/delete table\.dataset\.bcPartySize/.test(turn)],
 ["open certification emits completed turn",/bc:table-turn-completed/.test(turn)],
 ["CLEANING→OPEN remains human-owned",/primary\.textContent = 'Mark table open'/.test(app)],
 ["57 bridge loaded before 58 certification",html.indexOf("service-table-lifecycle-v100.2.57.js")>=0&&html.indexOf("service-table-lifecycle-v100.2.57.js")<html.indexOf("completed-visit-turn-certification-v100.2.58.js")],
 ["protected floor restoration marker remains",/V100\.2\.47 — Floor Layout Restoration/.test(floor)]
];
let passed=0;
for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(ok)passed++;}
console.log(`V100.2.59 validation ${passed}/${checks.length}`);
if(passed!==checks.length) process.exit(1);