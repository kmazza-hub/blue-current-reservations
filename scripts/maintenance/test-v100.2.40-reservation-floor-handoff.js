"use strict";
const fs=require("fs");
const path=require("path");
const root=process.cwd();
const app=fs.readFileSync(path.join(root,"client/js/app-v15.1.3.js"),"utf8");
const floor=fs.readFileSync(path.join(root,"client/js/floor-reservations-v62.0.js"),"utf8");
const css=fs.readFileSync(path.join(root,"client/styles.css"),"utf8");
const checks=[
  ["reserved tool portaled to body",app.includes("document.body.appendChild(reservedCard)")],
  ["legacy floorMap append removed",!app.includes("floorMap.appendChild(reservedCard)")],
  ["reservation detail has Add to waitlist",floor.includes('dialogSubmit.textContent="Add to waitlist"')],
  ["shared reservation handoff helper exists",floor.includes("function handoffReservationToFloor(article)")],
  ["handoff uses priority queue API",floor.includes("__bcArrivalPriorityQueueV100_2_17")&&floor.includes("priorityApi.moveArrivalToReady(article)")],
  ["mark arrived calls handoff",/data-reservation-detail-action="arrived"[\s\S]*handoffReservationToFloor\(article\)/.test(floor)],
  ["reservation detail submit calls handoff",floor.includes('mode==="reservation-details"&&activeReservationArticle)handoffReservationToFloor(activeReservationArticle)')],
  ["handoff returns to floor",floor.includes('setView("floor")')],
  ["reserved tool is fixed",/body > \.bc-reserved-table-tool-v100-2-26[\s\S]*position: fixed !important/.test(css)],
  ["reserved tool has topmost z-index",css.includes("z-index: 2147483000 !important")],
  ["V100.2.40 marker present",css.includes("V100.2.40 — Reserved Modal Portal + Reservation-to-Floor Handoff")]
];
let failed=0;
for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(!ok)failed++;}
if(failed){console.error(`V100.2.40 failed ${failed}/${checks.length} checks.`);process.exit(1);}
console.log(`V100.2.40 passed ${checks.length}/${checks.length} checks.`);
