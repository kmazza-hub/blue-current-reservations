"use strict";
const fs=require('fs'),path=require('path');
const root=process.cwd();
const css=fs.readFileSync(path.join(root,'client','styles.css'),'utf8');
const js=fs.readFileSync(path.join(root,'client','js','floor-reservations-v62.0.js'),'utf8');
const checks=[
 ['css marker',css.includes('V100.2.47 — Floor Layout Restoration')],
 ['js marker',js.includes('V100.2.47 — Floor Layout Restoration')],
 ['guest recognition preserved',css.includes('V100.2.46 — Guest recognition & hospitality memory')&&js.includes('guestRecognition')],
 ['hard room isolation',js.includes("table.style.setProperty('display','none','important')")],
 ['architecture rebuilt',js.includes('restoreArchitecture()')&&js.includes('Main dining room')&&js.includes('Waterfront dining')&&js.includes('Private dining room')],
 ['legacy decor removed',js.includes("querySelectorAll('.bc-world-decor-v100-2-37').forEach(node=>node.remove())")],
 ['main organic positions',css.includes('[data-bc-active-zone="main"] .host-table[data-table="2"]{left:20%')],
 ['waterfront organic positions',css.includes('[data-bc-active-zone="waterfront"] .host-table[data-table="30"]{left:68%')],
 ['private organic positions',css.includes('[data-bc-active-zone="private"] .host-table[data-table="46"]{left:39%')],
 ['selected does not grow excessively',css.includes('scale(1.025)')]
];
const failed=checks.filter(([,ok])=>!ok);checks.forEach(([name,ok])=>console.log(`${ok?'PASS':'FAIL'} ${name}`));
if(failed.length){console.error(`${failed.length} checks failed.`);process.exit(1);}console.log(`V100.2.47 validation passed ${checks.length}/${checks.length}.`);
