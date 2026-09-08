const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'../..');
const src=fs.readFileSync(path.join(root,'client/js/floor-reservations-v62.0.js'),'utf8');
const checks=[
 ['reservation creation returns created article',/function addReservation[\s\S]*return article;/.test(src)],
 ['submit captures reservation article',src.includes('reservationArticle=addReservation(')],
 ['focused dialog control blurred before close',src.includes('document.activeElement instanceof HTMLElement')&&src.includes('document.activeElement.blur()')],
 ['reservation completion restores reservations view',src.includes('if(mode==="reservation")')&&src.includes('setView("reservations")')],
 ['reservation panel is brought into view',src.includes('bcHostReservationsPanel')&&src.includes('scrollIntoView({behavior:"smooth",block:"nearest"})')],
 ['focus lands on new reservation details control',src.includes("reservationArticle?.querySelector('[data-reservation-action=\"details\"]')")],
 ['walk-in completion still returns to floor',src.includes('else if(mode==="walkin")')&&src.includes('setView("floor")')],
 ['no server or persistence contract introduced',!src.includes('/api/')]
];
const failed=checks.filter(([,ok])=>!ok).map(([name])=>name);
console.log(JSON.stringify({ok:failed.length===0,repair:'V100.2.3 Reservation Completion Workspace & Focus',baselineVersion:'100.0.0',checks:checks.map(([name])=>name),failed},null,2));
process.exitCode=failed.length?1:0;
