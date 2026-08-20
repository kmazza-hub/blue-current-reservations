const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'../..');
const css=fs.readFileSync(path.join(root,'client/styles.css'),'utf8');
const checks=[
 ['service-scale release marker',/V100\.2\.9 · Host Stand Service-Scale Typography/],
 ['queue tabs enlarged',/#host-stand \.queue-tabs button\{[\s\S]*?font-size:10px!important;[\s\S]*?font-weight:800!important/],
 ['queue rows gain service spacing',/#host-stand \.queue-item\{[\s\S]*?padding:15px 0!important/],
 ['guest names enlarged',/#host-stand \.queue-item strong\{[\s\S]*?font-size:10px!important;[\s\S]*?font-weight:800!important/],
 ['party details enlarged',/#host-stand \.queue-item small\{[\s\S]*?font-size:9px!important/],
 ['arrival times enlarged',/#host-stand \.arrival-time\{[\s\S]*?font-size:9px!important;[\s\S]*?font-weight:900!important/],
 ['seat controls remain touch sized',/#host-stand #waitlistQueue \.queue-item button\{[\s\S]*?min-height:46px!important;[\s\S]*?font-size:9px!important/],
 ['arrival chips enlarged',/#host-stand #arrivalQueue \.arrival-chip\{[\s\S]*?font-size:8px!important/],
 ['tonights moments labels enlarged',/#host-stand \.host-note-card strong\{[\s\S]*?font-size:9px!important/],
 ['tonights moments metadata enlarged',/#host-stand \.host-note-card span\{[\s\S]*?font-size:8px!important/],
 ['V100.2.8 active-tab contrast preserved',/#host-stand \.queue-tabs button\.active\{[\s\S]*?color:#082631!important;[\s\S]*?background:#f1f7f5!important/],
 ['V100.2.8 guest contrast preserved',/#host-stand \.queue-item strong\{[\s\S]*?color:#ffffff!important/]
];
const failed=checks.filter(([,re])=>!re.test(css)).map(([name])=>name);
console.log(JSON.stringify({ok:failed.length===0,repair:'V100.2.9 Host Stand Service-Scale Typography',baselineVersion:'100.0.0',checks:checks.map(([name])=>name),failed},null,2));
if(failed.length)process.exit(1);
