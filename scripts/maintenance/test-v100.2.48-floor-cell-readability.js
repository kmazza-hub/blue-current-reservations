"use strict";
const fs=require('fs'),path=require('path');
const css=fs.readFileSync(path.join(process.cwd(),'client','styles.css'),'utf8');
const checks=[
 ['marker',css.includes('V100.2.48 — Floor Cell Readability Lock')],
 ['restored floor preserved',css.includes('V100.2.47 — Floor Layout Restoration')],
 ['capacity moved inside',css.includes('position:static !important')&&css.includes('content:attr(data-bc-top-label) !important')],
 ['strong table number',css.includes('font-size:15px !important')&&css.includes('font-weight:950 !important')],
 ['strong live state',css.includes('font-size:16px !important')&&css.includes('min-height:20px !important')],
 ['cleaning contained',css.includes('.host-table.cleaning small')&&css.includes('letter-spacing:-.025em !important')],
 ['2-top readable cell',css.includes('--bc-table-w:82px !important')&&css.includes('--bc-table-h:82px !important')],
 ['6-top readable cell',css.includes('--bc-table-w:108px !important')],
 ['8-top readable cell',css.includes('--bc-table-w:120px !important')],
 ['busy contrast',css.includes('-webkit-text-fill-color:#ffffff !important')],
 ['selection collision safe',css.includes('scale(1.015) !important')]
];
const failed=checks.filter(([,ok])=>!ok);checks.forEach(([name,ok])=>console.log(`${ok?'PASS':'FAIL'} ${name}`));
if(failed.length){console.error(`${failed.length} checks failed.`);process.exit(1);}console.log(`V100.2.48 validation passed ${checks.length}/${checks.length}.`);
