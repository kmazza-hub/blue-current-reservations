const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'../..');
const html=fs.readFileSync(path.join(root,'client/index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'client/styles.css'),'utf8');
const js=fs.readFileSync(path.join(root,'client/js/fullscreen-floor-clarity-v100.3.10.js'),'utf8');
const checks=[
 ['script wired',html.includes('fullscreen-floor-clarity-v100.3.10.js?v=100.3.10')],
 ['seating lifecycle preserved',js.includes('if(seatingMode())return')],
 ['reserved workflow preserved',js.includes('if(status==="reserved")')&&js.includes('preserve existing reservation controls')],
 ['status dialog native',js.includes('showModal()')],
 ['map noise cleanup',js.includes('bc-floor-map-nonessential-v100-3-10')],
 ['three equal tabs',css.includes('grid-template-columns:repeat(3,minmax(0,1fr))')],
 ['reserved centered',css.includes('bc-fullscreen-floor-modal')&&css.includes('position:fixed!important')], 
 ['reserved high layer',css.includes('z-index:2147483646!important')],
 ['dialog backdrop',css.includes('bc-floor-table-status-dialog-v100-3-10::backdrop')],
 ['nonessential hidden',css.includes('>.bc-floor-map-nonessential-v100-3-10{display:none!important}')]
];
let ok=0;for(const [name,pass] of checks){console.log(`${pass?'PASS':'FAIL'} ${name}`);if(pass)ok++;}
console.log(`V100.3.10 floor clarity: ${ok}/${checks.length}`);process.exit(ok===checks.length?0:1);
