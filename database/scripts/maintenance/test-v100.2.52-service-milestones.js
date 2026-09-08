const fs=require('fs'),path=require('path');
const file=path.join(process.cwd(),'client','js','floor-reservations-v62.0.js');
const text=fs.readFileSync(file,'utf8');
const checks=[
 ['service milestone marker',text.includes('V100.2.52 — Service Milestones')],
 ['service update API',text.includes('update:(match,updates={})')&&text.includes('bc:service-party-updated')],
 ['single next-action model',text.includes('One table. One current state. One obvious next action.')],
 ['greet milestone',text.includes('Mark greeted')&&text.includes('greeted:{label:"Greeted"')],
 ['order milestone',text.includes('Order started')&&text.includes('ordering:{label:"Ordering"')],
 ['food milestone',text.includes('Food delivered')&&text.includes('dining:{label:"Dining"')],
 ['check milestone',text.includes('Check dropped')&&text.includes('check:{label:"Check down"')],
 ['completion retained',text.includes('Complete service')&&text.includes('BlueCurrentServiceHandoff?.clear')],
 ['needs greeting signal',text.includes('Needs greeting')&&text.includes('3*60000')],
 ['host stand lifecycle preserved',text.includes('bc:host-guest-seated')&&text.includes('requestAnimationFrame(()=>item.remove())')],
 ['guest memory preserved',text.includes('guestRecognitionSummary')&&text.includes('updateGuestProfile')]
];
let failed=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++;}
console.log(`\n${checks.length-failed}/${checks.length} checks passed.`);if(failed)process.exit(1);
