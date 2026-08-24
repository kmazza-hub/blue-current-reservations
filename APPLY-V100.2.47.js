"use strict";
const fs=require('fs'),path=require('path');
const root=process.cwd(),kit=__dirname;
const cssDst=path.join(root,'client','styles.css'),jsDst=path.join(root,'client','js','floor-reservations-v62.0.js');
if(!fs.existsSync(cssDst)||!fs.existsSync(jsDst))throw new Error('V100.2.47 requires the current Blue Current repo with client/styles.css and floor-reservations-v62.0.js');
const currentCss=fs.readFileSync(cssDst,'utf8');
if(!currentCss.includes('V100.2.46 — Guest recognition & hospitality memory'))throw new Error('V100.2.47 requires V100.2.46 first.');
if(currentCss.includes('V100.2.47 — Floor Layout Restoration')){console.log('V100.2.47 already applied.');process.exit(0);}
for(const rel of ['client/js/floor-reservations-v62.0.js','client/styles.css']){
  const src=path.join(kit,'patches',rel),dst=path.join(root,rel);
  if(!fs.existsSync(src))throw new Error(`Missing patch ${src}`);
  fs.copyFileSync(dst,dst+'.v100.2.47.bak');
  fs.copyFileSync(src,dst);
  console.log(`patched ${rel}`);
}
const testSrc=path.join(kit,'scripts/maintenance/test-v100.2.47-floor-layout-restoration.js');
const testDst=path.join(root,'scripts/maintenance/test-v100.2.47-floor-layout-restoration.js');
fs.mkdirSync(path.dirname(testDst),{recursive:true});fs.copyFileSync(testSrc,testDst);
console.log(JSON.stringify({ok:true,version:'100.2.47',repair:'Floor Layout Restoration',fixes:['restored distinct Main floor, Waterfront, and Private dining maps','removed raw/duplicate architectural labels and legacy world-decor overlays','hard-isolated tables to their assigned room so tabs cannot composite multiple floor plans','restored organic restaurant-style table placement with breathing room','preserved V100.2.46 guest recognition and hospitality memory']},null,2));
