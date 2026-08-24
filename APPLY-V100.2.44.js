const fs=require('fs');const path=require('path');
const root=process.cwd(),kit=__dirname;
const files=[['patches/client/js/floor-reservations-v62.0.js','client/js/floor-reservations-v62.0.js'],['patches/client/styles.css','client/styles.css']];
for(const [srcRel,dstRel] of files){const src=path.join(kit,srcRel),dst=path.join(root,dstRel);if(!fs.existsSync(src))throw new Error(`Missing patch payload: ${srcRel}`);if(!fs.existsSync(dst))throw new Error(`Expected V100.2.43 target missing: ${dstRel}`);const backup=`${dst}.v100.2.43.bak`;if(!fs.existsSync(backup))fs.copyFileSync(dst,backup);fs.copyFileSync(src,dst);console.log(`updated ${dstRel}`)}
console.log(JSON.stringify({ok:true,version:'100.2.44',surface:'host-guests',status:'guest-workspace-foundation'},null,2));
