const fs=require('fs');
const p='client/js/floor-reservations-v62.0.js';
const s=fs.readFileSync(p,'utf8');
const checks=[
 ['host handoff preserved',s.includes('bc:host-guest-seated')],
 ['service intake listener',s.includes('addEventListener("bc:host-guest-seated"')],
 ['persistent active service parties',s.includes('blueCurrent.service.activeParties.v100')],
 ['service received event',s.includes('bc:service-party-received')],
 ['service handoff API',s.includes('BlueCurrentServiceHandoff')],
 ['active accessor',s.includes('getActive:')],
 ['completion clear seam',s.includes('clear:(match)')],
 ['dedupe key',s.includes('servicePartyKey')],
 ['guest required',s.includes('if(!guest)return')],
 ['bounded storage',s.includes('rows.slice(0,100)')]
];
checks.forEach(([n,ok])=>console.log(`${ok?'PASS':'FAIL'} ${n}`));
if(checks.some(x=>!x[1]))process.exit(1);
console.log(`PASS ${checks.length}/${checks.length} V100.2.50 service intake handoff`);
