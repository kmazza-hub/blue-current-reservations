const fs=require('fs');
const js=fs.readFileSync('client/js/ipad-operator-focus-v100.3.5.js','utf8');
const css=fs.readFileSync('client/styles.css','utf8');
const html=fs.readFileSync('client/index.html','utf8');
const checks=[
 ['runtime hook upgraded',html.includes('ipad-operator-focus-v100.3.5.js?v=100.3.5')&&!html.includes('ipad-operator-focus-v100.3.4.js?v=100.3.4')],
 ['exact viewport lock',js.includes('function lockViewportTo')&&js.includes('window.scrollTo')&&js.includes('visualViewport')],
 ['mutation/layout settling',js.includes('MutationObserver')&&js.includes('duration:2100')],
 ['guest exact target',js.includes('bcHostGuestsPanel')&&js.includes('bcGuestSearchInput')],
 ['service run-floor target',js.includes('#digital-twin .twin-app')],
 ['kitchen exact target',js.includes('kitchenThroughputCenter')&&js.includes('querySelector("header")')],
 ['staff live-truth target',js.includes('bc-staff-truth-v264')],
 ['full-screen floor control',js.includes('bcFloorFullscreenButton')&&js.includes('Full screen floor')],
 ['floor focus API',js.includes('function focusFloor')&&js.includes('function exitFloor')],
 ['seating enters full-screen floor',js.includes('if(text==="seat")')&&js.includes('focusFloor("seating")')],
 ['full viewport floor CSS',css.includes('height:100dvh!important')&&css.includes('grid-template-rows:auto auto minmax(0,1fr)')],
 ['full-screen hides non-floor dock',css.includes('html.bc-ipad-floor-focus .bc-rush-dock{display:none!important}')],
 ['larger floor targets',css.includes('transform:scale(1.18)')],
 ['no server/auth mutation',!js.includes('/api/auth')&&!js.includes('fetch(')]
];
let pass=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(ok)pass++;}
console.log(`V100.3.5 validation ${pass}/${checks.length}`);if(pass!==checks.length)process.exit(1);
