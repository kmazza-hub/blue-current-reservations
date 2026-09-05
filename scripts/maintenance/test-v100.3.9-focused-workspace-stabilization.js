const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'../..');
const js=fs.readFileSync(path.join(root,'client/js/focused-operator-workspaces-v100.3.9.js'),'utf8');
const css=fs.readFileSync(path.join(root,'client/styles.css'),'utf8');
const html=fs.readFileSync(path.join(root,'client/index.html'),'utf8');
const checks=[
 ['script reference v100.3.9',/focused-operator-workspaces-v100\.3\.9\.js\?v=100\.3\.9/.test(html)],
 ['idempotent same-target reentry',/currentJob===key&&currentTarget===target&&stage\.contains\(target\)/.test(js)],
 ['single placement guard',/currentPlacement\?\.target===target/.test(js)],
 ['canonical workflow wrapper marker',/__focusedWorkspacesV10039=true/.test(js)],
 ['direct rush fallback disabled when wrapper installed',/!window\.BlueCurrentWorkflows\?\.__focusedWorkspacesV10039/.test(js)],
 ['deterministic guests activation on back',/BlueCurrentHospitalityShell\?\.activate\?\.\("guests",\{scroll:false\}\)/.test(js)],
 ['deterministic floor host view on back',/data-host-view=\\"floor\\"/.test(js)||/data-host-view="floor"/.test(js)],
 ['host hash reset',/#host-stand/.test(js)],
 ['kitchen mount visibility guard',/keepTargetUsable\(target,key\)/.test(js)&&/ktRefresh/.test(js)],
 ['kitchen focused display',/#kitchenThroughputCenter\.bc-operator-focus-target[\s\S]*display:block!important/.test(css)],
 ['dock fixed six columns',/#bcRushDock[\s\S]*grid-template-columns:repeat\(6,minmax\(0,1fr\)\)!important/.test(css)],
 ['dock fixed width',/#bcRushDock[\s\S]*width:min\(1000px,calc\(100vw - 40px\)\)!important/.test(css)],
 ['dock button stable height',/#bcRushDock \[data-rush-job\][\s\S]*min-height:58px!important/.test(css)],
 ['mobile dock fallback',/@media\(max-width:719px\)[\s\S]*repeat\(3,minmax\(0,1fr\)\)/.test(css)]
];
let passed=0;
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(ok)passed++;}
console.log(`V100.3.9: ${passed}/${checks.length}`);
if(passed!==checks.length)process.exit(1);
