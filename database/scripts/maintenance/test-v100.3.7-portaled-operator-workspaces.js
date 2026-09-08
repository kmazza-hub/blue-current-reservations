const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../..');const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const js=read('client/js/focused-operator-workspaces-v100.3.7.js'),css=read('client/styles.css'),html=read('client/index.html');
const checks=[
 ['version marker',js.includes('100.3.7')],
 ['portal navigation marker',js.includes('bcQuickJobNavigation="body-portal-workspace"')],
 ['operator stage',js.includes('bcOperatorFocusStage')&&css.includes('.bc-operator-focus-stage')],
 ['target physically portaled',js.includes('stage.replaceChildren(target)')],
 ['target restored to placeholder',js.includes('currentPlaceholder.parentNode.insertBefore(currentTarget,currentPlaceholder)')],
 ['back returns stable host',js.includes('returnToHostHome')&&js.includes('history.replaceState(null,"","#host-stand")')],
 ['guest target preserved',js.includes('bcHostGuestsPanel')],
 ['service target preserved',js.includes('#digital-twin .twin-app')],
 ['kitchen target preserved',js.includes('kitchenThroughputCenter')],
 ['staff target preserved',js.includes('.bc-staff-truth-v264')],
 ['floor stage',js.includes('bcFloorFocusStage')&&css.includes('.bc-floor-focus-stage')],
 ['floor target portaled',js.includes('stage.append(fh,panel)')],
 ['seat enters floor focus',js.includes('text==="seat"')&&js.includes('focusFloor("seating")')],
 ['new script loaded',html.includes('focused-operator-workspaces-v100.3.7.js?v=100.3.7')],
 ['old v100.3.6 script unloaded',!html.includes('focused-operator-workspaces-v100.3.6.js?v=100.3.6')]
];let fail=0;for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${n}`);if(!ok)fail++;}console.log(`V100.3.7 portaled operator workspaces: ${checks.length-fail}/${checks.length}`);process.exit(fail?1:0);
