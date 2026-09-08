const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'../..');
const file=fs.readFileSync(path.join(root,'client/js/modules/guestJourney.js'),'utf8');
const checks=[
  ['guest journey focus release helper exists',/function releaseJourneyFocus\(\)\s*\{[\s\S]*?root\.contains\(active\)[\s\S]*?active\.blur\(\)/],
  ['run full journey releases focus before reset',/function runFullJourney\(\)\s*\{[\s\S]*?releaseJourneyFocus\(\);\s*reset\(\);/],
  ['reset control releases focus before reset',/guestJourneyReset"\)\?\.addEventListener\("click",\s*\(\)\s*=>\s*\{[\s\S]*?releaseJourneyFocus\(\);\s*reset\(\);/],
  ['guest journey play binding preserved',/guestJourneyPlay"\)\?\.addEventListener\("click",\s*runFullJourney\)/],
  ['journey sequence preserved',/"followup:scheduled"/]
];
const failed=checks.filter(([,re])=>!re.test(file)).map(([name])=>name);
console.log(JSON.stringify({ok:failed.length===0,repair:'V100.2.7 Guest Journey Focus & Visibility Lifecycle',baselineVersion:'100.0.0',checks:checks.map(([name])=>name),failed},null,2));
if(failed.length)process.exit(1);
