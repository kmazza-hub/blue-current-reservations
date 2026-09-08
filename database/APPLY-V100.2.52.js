const fs=require('fs'),path=require('path');
const root=process.cwd();
const src=path.join(__dirname,'patches','client','js','floor-reservations-v62.0.js');
const dst=path.join(root,'client','js','floor-reservations-v62.0.js');
if(!fs.existsSync(dst)) throw new Error('Expected client/js/floor-reservations-v62.0.js. Apply V100.2.51 first.');
fs.copyFileSync(src,dst);
console.log(JSON.stringify({ok:true,version:'100.2.52',surface:'service-milestones-next-action',status:'applied'},null,2));
