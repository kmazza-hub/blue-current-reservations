const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'../..');
const css=fs.readFileSync(path.join(root,'client/styles.css'),'utf8');
const js=fs.readFileSync(path.join(root,'client/js/floor-reservations-v62.0.js'),'utf8');
const checks=[
  ['inactive queue tab is bright on dark',/#host-stand \.queue-tabs button\{[\s\S]*?color:#d7edf2!important/],
  ['active queue tab is dark on light',/#host-stand \.queue-tabs button\.active\{[\s\S]*?color:#082631!important;[\s\S]*?background:#f1f7f5!important/],
  ['queue guest names remain bright',/#host-stand \.queue-item strong\{[\s\S]*?color:#ffffff!important/],
  ['queue metadata and arrival times remain readable',/#host-stand \.queue-item small,[\s\S]*?#host-stand \.arrival-time\{[\s\S]*?color:#c9e3e9!important/],
  ['enabled seat action is high contrast',/#host-stand #waitlistQueue \.queue-item button\{[\s\S]*?color:#ffffff!important;[\s\S]*?background:#0d6f8c!important/],
  ['completed seat action remains readable',/#host-stand #waitlistQueue \.queue-item\.bc-seated button,[\s\S]*?#host-stand #waitlistQueue \.queue-item button:disabled\{[\s\S]*?color:#dce9ed!important;[\s\S]*?background:#294d59!important/],
  ['arrived chip stays readable',/#host-stand #arrivalQueue \.arrival-chip\{[\s\S]*?color:#285f4d!important;[\s\S]*?background:#edf8f2!important/],
  ['pending arrival chip stays readable',/#host-stand #arrivalQueue \.arrival-chip\.pending\{[\s\S]*?color:#6c531b!important;[\s\S]*?background:#fff2d9!important/],
  ['seat handler remains per-button scoped',/function wireSeatButton\(button\)[\s\S]*?const item=button\.closest\("\.queue-item"\)[\s\S]*?button\.textContent="Seated"/],
  ['queue tab switching behavior preserved',/document\.getElementById\("waitlistQueue"\)\?\.classList\.remove\("hidden"\)[\s\S]*?document\.getElementById\("arrivalQueue"\)\?\.classList\.add\("hidden"\)/]
];
const failed=checks.filter(([,re])=>!re.test(re===checks[8]?.[1]||re===checks[9]?.[1]?js:css)).map(([name])=>name);
// Evaluate JS-specific checks explicitly to avoid relying on array identity semantics.
const jsChecks=[
  ['seat handler remains per-button scoped',/function wireSeatButton\(button\)[\s\S]*?const item=button\.closest\("\.queue-item"\)[\s\S]*?button\.textContent="Seated"/],
  ['queue tab switching behavior preserved',/document\.getElementById\("waitlistQueue"\)\?\.classList\.remove\("hidden"\)[\s\S]*?document\.getElementById\("arrivalQueue"\)\?\.classList\.add\("hidden"\)/]
];
const cssChecks=checks.slice(0,8);
const failures=[...cssChecks.filter(([,re])=>!re.test(css)).map(([name])=>name),...jsChecks.filter(([,re])=>!re.test(js)).map(([name])=>name)];
console.log(JSON.stringify({ok:failures.length===0,repair:'V100.2.8 Host Stand Contrast Hardening',baselineVersion:'100.0.0',checks:[...cssChecks,...jsChecks].map(([name])=>name),failed:failures},null,2));
if(failures.length)process.exit(1);
