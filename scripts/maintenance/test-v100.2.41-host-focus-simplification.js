"use strict";
const fs=require("fs"),path=require("path");
const root=process.cwd();
const html=fs.readFileSync(path.join(root,"client","index.html"),"utf8");
const floor=fs.readFileSync(path.join(root,"client","js","floor-reservations-v62.0.js"),"utf8");
const css=fs.readFileSync(path.join(root,"client","styles.css"),"utf8");
const checks=[
 [!html.includes('Tonight’s moments'),"Host Stand Tonight’s moments block removed"],
 [!floor.includes('data-reservation-detail-action="arrived"'),"Reservation detail Mark arrived action removed"],
 [floor.includes('dialogSubmit.textContent="Add to waitlist"'),"Add to waitlist remains reservation detail submit action"],
 [floor.includes('handoffReservationToFloor(activeReservationArticle)'),"Reservation detail submit still hands off to Floor"],
 [floor.includes('article.dataset.reservationStatus="Arrived"'),"Waitlist handoff still normalizes reservation to Arrived"],
 [floor.includes('Review seating preference and notes'),"Host focus copy matches simplified workflow"],
 [floor.includes('data-reservation-detail-action="edit"'),"Edit reservation preserved"],
 [floor.includes('data-reservation-detail-action="cancel"'),"Cancel reservation preserved"],
 [css.includes('V100.2.41 — Host Focus Simplification'),"V100.2.41 CSS marker present"]
];
let pass=0;for(const [ok,label] of checks){console.log(`${ok?'PASS':'FAIL'} ${label}`);if(ok)pass++;}
console.log(`V100.2.41: ${pass}/${checks.length} checks passed.`);if(pass!==checks.length)process.exit(1);
