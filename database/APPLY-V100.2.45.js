const fs=require('fs'),path=require('path');
const root=process.cwd(),kit=__dirname;
const files=['client/js/floor-reservations-v62.0.js','client/styles.css'];
for(const rel of files){const src=path.join(kit,'patches',rel),dst=path.join(root,rel);if(!fs.existsSync(src))throw new Error(`Missing patch ${src}`);fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(src,dst);console.log(`patched ${rel}`);}
const testSrc=path.join(kit,'scripts/maintenance/test-v100.2.45-guest-profile-intelligence.js');
const testDst=path.join(root,'scripts/maintenance/test-v100.2.45-guest-profile-intelligence.js');fs.mkdirSync(path.dirname(testDst),{recursive:true});fs.copyFileSync(testSrc,testDst);
console.log('Applied V100.2.45 Guest Profile Intelligence');
