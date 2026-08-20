const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'../..');
const js=fs.readFileSync(path.join(root,'client/js/floor-reservations-v62.0.js'),'utf8');
const styles=fs.readFileSync(path.join(root,'client/styles.css'),'utf8');
const checks=[
  ['reservation details mode exists', /mode==="reservation-details"/],
  ['details expose time party seating status notes', /bc-reservation-detail__grid[\s\S]*?<dt>Time<\/dt>[\s\S]*?<dt>Party<\/dt>[\s\S]*?<dt>Seating<\/dt>[\s\S]*?<dt>Status<\/dt>[\s\S]*?Occasion \/ notes/],
  ['mark arrived operation wired', /data-reservation-detail-action="arrived"[\s\S]*?reservationStatus="Arrived"/],
  ['edit reservation operation wired', /data-reservation-detail-action="edit"[\s\S]*?openDialog\("edit-reservation"/],
  ['cancel reservation operation wired', /data-reservation-detail-action="cancel"[\s\S]*?article\.remove\(\)/],
  ['edit submission updates existing article', /mode==="edit-reservation"&&activeReservationArticle[\s\S]*?updateReservationArticle/],
  ['detail actions readable', /bc-reservation-detail__actions button\{[\s\S]*?background:#0b6078[\s\S]*?color:#fff/],
  ['reservation readability preserved', /#host-stand #bcReservationList article strong\{[\s\S]*?color:#ffffff!important/]
];
const failed=checks.filter(([,re])=>!re.test(js+'\n'+styles)).map(([name])=>name);
console.log(JSON.stringify({ok:failed.length===0,repair:'V100.2.5 Reservation Detail Operations',baselineVersion:'100.0.0',checks:checks.map(([name])=>name),failed},null,2));
if(failed.length)process.exit(1);
