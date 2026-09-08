const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'../..');
const js=fs.readFileSync(path.join(root,'client/js/fullscreen-floor-clarity-v100.3.10.js'),'utf8');
const html=fs.readFileSync(path.join(root,'client/index.html'),'utf8');
const checks=[
 ['version bump',js.includes('VERSION="100.3.10.1"')],
 ['no global body subtree observer',!js.includes('observer.observe(document.body')],
 ['root class observer retained',js.includes('rootObserver.observe(document.documentElement')],
 ['floor-only observer root',js.includes('#bcFloorFocusStage #hostFloorMap')],
 ['floor observer disconnects',js.includes('disconnectFloorObserver')],
 ['guest-safe lifecycle guard',js.includes('if(!inFocusedFloor()){disconnectFloorObserver();return;}')],
 ['table click behavior retained',js.includes('openStatusDialog(table)')],
 ['reserved tool behavior retained',js.includes('focusReservedTool')],
 ['cache bust updated',html.includes('fullscreen-floor-clarity-v100.3.10.js?v=100.3.10.1')]
];
let fail=0;
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)fail++;}
console.log(`\nV100.3.10.1 freeze repair gate: ${checks.length-fail}/${checks.length}`);
process.exitCode=fail?1:0;
