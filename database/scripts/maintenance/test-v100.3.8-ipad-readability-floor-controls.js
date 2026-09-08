const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'../..');
const css=fs.readFileSync(path.join(root,'client/styles.css'),'utf8');
const checks=[
 ['guest focused result card',/bcOperatorFocusStage[\s\S]*bcHostGuestsPanel|bc-operator-focus-stage>[\s\S]*#bcHostGuestsPanel/],
 ['guest result bright strong',/#bcGuestSearchResults > button strong[\s\S]*color:#ffffff!important/],
 ['guest result readable secondary',/#bcGuestSearchResults > button span,[\s\S]*color:#d5eef2!important/],
 ['floor tabs grid',/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important/],
 ['floor tabs large target',/button\[data-host-zone\][\s\S]*min-height:58px!important/],
 ['recommendation hidden in focus',/#hostRecommendation,[\s\S]*display:none!important/],
 ['fixture copy suppression',/bc-floor-zone-note-v100-2-35[\s\S]*color:transparent!important/],
 ['table text emphasis',/bc-ipad-floor-focus #hostFloorMap \.host-table span[\s\S]*font-weight:950!important/]
];
let passed=0;
for(const [name,re] of checks){const ok=re.test(css);console.log(`${ok?'PASS':'FAIL'} ${name}`);if(ok)passed++;}
console.log(`V100.3.8: ${passed}/${checks.length}`);
if(passed!==checks.length)process.exit(1);
