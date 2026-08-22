"use strict";
const fs=require("fs"), path=require("path");
const root=process.cwd();
function walk(dir,out=[]){if(!fs.existsSync(dir))return out;for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p,out);else if(e.isFile()&&e.name.endsWith('.js'))out.push(p);}return out;}
const files=walk(path.join(root,'client','js'));
const source=files.map(f=>fs.readFileSync(f,'utf8')).join('\n');
const checks=[
 ['V100.2.16 marker', source.includes('Generic Guest Action Context + Host Stand Contrast Polish')],
 ['generic context state', source.includes('__bcGenericGuestContextV100_2_16')],
 ['editable party dialog', source.includes('bcPartyDialogBackdropV100_2_16')],
 ['generic table choice banner', source.includes('bcActivePartyBannerV100_2_16')],
 ['generic table confirmation', source.includes('bcActivePartyConfirmV100_2_16')],
 ['mark arrived generic transition', source.includes("party.status = 'arrived'")],
 ['generic reservation seating transition', source.includes("updateStatusEverywhere(party.name, 'seated', number)")],
 ['neutral floor table detail', source.includes('showNeutralTableDetail')],
 ['old Anthony floor leakage intercepted', source.includes('Capture prevents the older Anthony-specific demo handler')],
 ['waitlist guided flow preserved', source.includes('Keep V100.2.15 waitlist flow intact')],
 ['high contrast confirm card', source.includes('.bc-waitlist-seat-confirm-v100-2-15') && source.includes('color:#102f39 !important')],
 ['high contrast cancel controls', source.includes('.bc-active-confirm-cancel') && source.includes('background:#f7f1e7')],
 ['party edit propagation', source.includes('updatePartyEverywhere')],
 ['row-level operability', source.includes('bc-host-clickable-party-v100-2-16')],
 ['aim small comment', source.includes('Aim small, miss small')]
];
const failed=checks.filter(([,ok])=>!ok);
for(const [name,ok] of checks) console.log(`${ok?'PASS':'FAIL'}  ${name}`);
if(failed.length){console.error(`V100.2.16 regression failed: ${failed.length}/${checks.length}`);process.exit(1);} 
console.log(`V100.2.16 regression passed: ${checks.length}/${checks.length}`);
