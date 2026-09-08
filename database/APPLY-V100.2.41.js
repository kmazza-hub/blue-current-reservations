"use strict";
const fs=require("fs");
const path=require("path");
const root=process.cwd();
const indexPath=path.join(root,"client","index.html");
const floorPath=path.join(root,"client","js","floor-reservations-v62.0.js");
const cssPath=path.join(root,"client","styles.css");
for(const p of [indexPath,floorPath,cssPath]){if(!fs.existsSync(p)){console.error(`V100.2.41 apply failed: missing ${path.relative(root,p)}`);process.exit(1);}}
let html=fs.readFileSync(indexPath,"utf8");
let floor=fs.readFileSync(floorPath,"utf8");
let css=fs.readFileSync(cssPath,"utf8");
if(!css.includes("V100.2.40 — Reserved Modal Portal + Reservation-to-Floor Handoff")){console.error("V100.2.41 requires V100.2.40 first.");process.exit(1);}
if(css.includes("V100.2.41 — Host Focus Simplification")){console.log("V100.2.41 already applied.");process.exit(0);}
const replaceOnce=(text,from,to,label)=>{if(!text.includes(from)){console.error(`V100.2.41 apply failed: ${label} anchor not found.`);process.exit(1);}return text.replace(from,to);};
fs.writeFileSync(indexPath+".v100.2.41.bak",html);
fs.writeFileSync(floorPath+".v100.2.41.bak",floor);
fs.writeFileSync(cssPath+".v100.2.41.bak",css);

const moments=`                  <div class="host-note-card">\n                    <div class="host-note-head"><span>Tonight’s moments</span><small>2</small></div>\n                    <div><i>✦</i><p><strong>Birthday</strong><span>Anthony Russo · 7:30 PM</span></p></div>\n                    <div><i>♡</i><p><strong>Anniversary</strong><span>Melissa Grant · 7:15 PM</span></p></div>\n                  </div>\n`;
html=replaceOnce(html,moments,"","Tonight's moments block");

floor=replaceOnce(floor,
`       <div class="bc-reservation-detail__focus"><small>Host focus</small><p>Confirm arrival status, seating preference, and celebration notes before assigning a table.</p></div>\n       <div class="bc-reservation-detail__actions">\n         <button type="button" data-reservation-detail-action="arrived">Mark arrived</button>\n         <button type="button" data-reservation-detail-action="edit">Edit reservation</button>\n         <button type="button" data-reservation-detail-action="cancel" class="danger">Cancel reservation</button>\n       </div>`,
`       <div class="bc-reservation-detail__focus"><small>Host focus</small><p>Review seating preference and notes, then add the party to the waitlist when they are ready to be seated.</p></div>\n       <div class="bc-reservation-detail__actions">\n         <button type="button" data-reservation-detail-action="edit">Edit reservation</button>\n         <button type="button" data-reservation-detail-action="cancel" class="danger">Cancel reservation</button>\n       </div>`,
"reservation detail primary actions");

floor=replaceOnce(floor,
`   dialogBody.querySelector('[data-reservation-detail-action="arrived"]')?.addEventListener("click",()=>{\n     handoffReservationToFloor(article);\n     if(document.activeElement instanceof HTMLElement)document.activeElement.blur();\n     closeDialog();\n   });\n`,
"",
"mark-arrived detail handler");

css += `\n\n/* V100.2.41 — Host Focus Simplification */\n/* Reservation details keep one operational handoff: Add to waitlist. */\n.bc-reservation-detail__actions {\n  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;\n}\n@media (max-width: 700px) {\n  .bc-reservation-detail__actions { grid-template-columns: 1fr !important; }\n}\n`;

fs.writeFileSync(indexPath,html);
fs.writeFileSync(floorPath,floor);
fs.writeFileSync(cssPath,css);
console.log(JSON.stringify({ok:true,version:"100.2.41",repair:"Host Focus Simplification",fixes:["removed the Tonight’s moments block from the Floor sidebar","removed the redundant Mark arrived button from reservation detail","kept Add to waitlist as the single authoritative reservation-to-floor handoff","updated Host focus copy to match the simplified workflow","preserved edit/cancel reservation actions and all floor/seating logic"]},null,2));
