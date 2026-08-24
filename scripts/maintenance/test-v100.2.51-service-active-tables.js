const fs=require('fs'),path=require('path');
const file=path.join(process.cwd(),'client','js','floor-reservations-v62.0.js');
const text=fs.readFileSync(file,'utf8');
const checks=[
 ['service active tables marker',text.includes('V100.2.51 — Service Active Tables')],
 ['service workspace API',text.includes('window.BlueCurrentServiceWorkspace')],
 ['active tables title',text.includes('Active tables')],
 ['active covers summary',text.includes('Active covers')],
 ['longest seated summary',text.includes('Longest seated')],
 ['service quick action wiring',text.includes('serviceQuickButton')&&text.includes('run floor')],
 ['service handoff store preserved',text.includes('blueCurrent.service.activeParties.v100')],
 ['service received live refresh',text.includes('bc:service-party-received')],
 ['complete service action',text.includes('Complete service')&&text.includes('BlueCurrentServiceHandoff?.clear')],
 ['floor lifecycle preserved',text.includes('bc:host-guest-seated')&&text.includes('requestAnimationFrame(()=>item.remove())')]
];
let failed=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++;}
console.log(`\n${checks.length-failed}/${checks.length} checks passed.`);if(failed)process.exit(1);
