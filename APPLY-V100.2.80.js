"use strict";
const fs=require("fs"),path=require("path"),crypto=require("crypto");
const root=process.cwd(),pkg=__dirname,manifest=require(path.join(pkg,"V100.2.80-APPLY-MANIFEST.json"));
const hash=file=>crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
if(!fs.existsSync(path.join(root,"scripts/maintenance/test-v100.2.79-timeclock-rush-certification.js"))||!fs.existsSync(path.join(root,"client/js/timeclock-truth-v100.2.76.js")))throw new Error("V100.2.80 requires applied V100.2.79 baseline.");
for(const [rel,expected] of Object.entries(manifest.protectedBaseline||{})){
  const dst=path.join(root,rel),target=manifest.targetHashes?.[rel];
  if(!fs.existsSync(dst))throw new Error(`Required baseline file missing: ${rel}`);
  const actual=hash(dst);
  if(actual!==expected&&actual!==target)throw new Error(`Refusing to overwrite unexpected ${rel}. Expected V100.2.79 baseline hash ${expected}, found ${actual}.`);
}
for(const rel of manifest.files){
  const src=path.join(pkg,"patches",rel),dst=path.join(root,rel);
  if(!fs.existsSync(src))throw new Error(`Missing patch: ${rel}`);
  fs.mkdirSync(path.dirname(dst),{recursive:true});
  if(fs.existsSync(dst)&&hash(dst)===hash(src)){console.log(`Already current ${rel}`);continue;}
  fs.copyFileSync(src,dst);console.log(`Applied ${rel}`);
}
console.log("V100.2.80 applied. Run: node scripts/maintenance/test-v100.2.80-inventory-truth-foundation.js");
