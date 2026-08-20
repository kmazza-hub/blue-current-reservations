const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'../..');
const styles=fs.readFileSync(path.join(root,'client/styles.css'),'utf8');
const checks=[
  ['reservation panel dark-surface ownership', /#host-stand #bcHostReservationsPanel\{[\s\S]*?background:#10313d!important/],
  ['reservation names forced readable', /#host-stand #bcReservationList article strong\{[\s\S]*?color:#ffffff!important/],
  ['reservation detail text forced readable', /#host-stand #bcReservationList article span\{[\s\S]*?color:#9fc3cf!important/],
  ['reservation time forced readable', /#host-stand #bcReservationList article time\{[\s\S]*?color:#a9dcec!important/],
  ['reservation details action high contrast', /button\[data-reservation-action="details"\][\s\S]*?background:#0b6078!important[\s\S]*?color:#ffffff!important/],
  ['expected badge readable', /b\[data-tone="expected"\][\s\S]*?background:#e9f3f7!important[\s\S]*?color:#315f73!important/],
  ['existing guest search contrast repair preserved', /#host-stand \.bc-host-search input\{[\s\S]*?color:#f7fbfd!important/]
];
const failed=checks.filter(([,re])=>!re.test(styles)).map(([name])=>name);
console.log(JSON.stringify({
  ok:failed.length===0,
  repair:'V100.2.4 Reservation Readability',
  baselineVersion:'100.0.0',
  checks:checks.map(([name])=>name),
  failed
},null,2));
if(failed.length)process.exit(1);
