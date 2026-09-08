const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const js=read('client/js/focused-operator-workspaces-v100.3.6.js');
const css=read('client/styles.css');
const html=read('client/index.html');
const checks=[
 ['version marker',js.includes('100.3.6')],
 ['fixed-workspace marker',js.includes('bcQuickJobNavigation="fixed-workspace"')],
 ['guest target',js.includes('bcHostGuestsPanel')],
 ['service live twin target',js.includes('#digital-twin .twin-app')],
 ['kitchen throughput target',js.includes('kitchenThroughputCenter')],
 ['staff live truth target',js.includes('.bc-staff-truth-v264')],
 ['no scroll lock engine',!js.includes('lockViewportTo(')],
 ['focus fixed positioning',css.includes('.bc-operator-focus-target')&&css.includes('position:fixed!important')],
 ['focus backdrop',css.includes('.bc-operator-focus-backdrop')],
 ['rush dock retained',css.includes('html.bc-operator-focus-mode .bc-rush-dock{display:flex!important')],
 ['floor focus retained',js.includes('focusFloor(')&&css.includes('html.bc-ipad-floor-focus')],
 ['seat enters floor focus',js.includes('text==="seat"')&&js.includes('focusFloor("seating")')],
 ['new script loaded',html.includes('focused-operator-workspaces-v100.3.6.js?v=100.3.6')],
 ['old v100.3.5 script unloaded',!html.includes('ipad-operator-focus-v100.3.5.js?v=100.3.5')]
];
let fail=0;for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${n}`);if(!ok)fail++;}
console.log(`V100.3.6 focused operator workspaces: ${checks.length-fail}/${checks.length}`);process.exit(fail?1:0);
