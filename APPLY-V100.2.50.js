const fs=require('fs'),path=require('path');
const root=process.cwd();
const src=path.join(__dirname,'patches','client','js','floor-reservations-v62.0.js');
const dst=path.join(root,'client','js','floor-reservations-v62.0.js');
if(!fs.existsSync(dst)) throw new Error('Expected client/js/floor-reservations-v62.0.js. Apply V100.2.49 first.');
fs.copyFileSync(src,dst);
console.log(JSON.stringify({ok:true,version:'100.2.50',surface:'service-intake-handoff',status:'applied'},null,2));
