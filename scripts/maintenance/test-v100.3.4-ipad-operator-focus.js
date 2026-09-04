const fs=require('fs');
const js=fs.readFileSync('client/js/ipad-operator-focus-v100.3.4.js','utf8');
const css=fs.readFileSync('client/styles.css','utf8');
const html=fs.readFileSync('client/index.html','utf8');
const checks=[
 ['runtime hook',html.includes('ipad-operator-focus-v100.3.4.js?v=100.3.4')],
 ['Service deterministic target',js.includes('serviceCoordination')&&js.includes('service-coordination')],
 ['Kitchen deterministic target',js.includes('kitchenThroughputCenter')],
 ['Staff target preserved',js.includes('workforce-intelligence')],
 ['settled iPad scrolling',js.includes('[120,320,650]')&&js.includes('[360,700,1050]')],
 ['floor focus API',js.includes('function focusFloor')&&js.includes('function exitFloor')],
 ['seating enters focus',js.includes('"seating"')],
 ['seating completion exits focus',js.includes('bc:host-guest-seated')],
 ['safe viewport CSS',css.includes('--bc-ipad-safe-top')&&css.includes('100dvh')],
 ['floor focus overlay CSS',css.includes('bc-ipad-floor-focus-panel')&&css.includes('position:fixed!important')],
 ['rush dock remains reachable',css.includes('html.bc-ipad-floor-focus .bc-rush-dock')],
 ['no server/auth change',!js.includes('/api/auth')&&!js.includes('fetch(')]
];
let pass=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(ok)pass++;}
console.log(`V100.3.4 validation ${pass}/${checks.length}`);if(pass!==checks.length)process.exit(1);
