"use strict";
const fs=require("fs"),path=require("path"),crypto=require("crypto");
const root=process.cwd(),sha=p=>crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const entries=[
  {rel:"client/js/ipad-resume-truth-v100.2.86.js",src:path.join(__dirname,"patches","client","js","ipad-resume-truth-v100.2.86.js"),before:"3fac9f6f8c19fd92600808828dd08aa38c3877accad11bf4a2791e95723cb8af",after:"dbfa762bb537899739c5c772148d46243f6ac3f0f65a35a11423678612ffdbac"},
  {rel:"scripts/maintenance/test-v100.2.86-ipad-resume-truth.js",src:path.join(__dirname,"scripts","maintenance","test-v100.2.86-ipad-resume-truth.js"),before:"debc522490e7b2a85071f01e3f94c5b02753460e7eb61b4c7f3bb77fb6309eb0",after:"73f0716592a3e71a24360889f4a8dd4bf8a8abee5a61c4d6b7a46342e95d8596"}
];
let changed=false;
for(const e of entries){
 const dst=path.join(root,e.rel);
 if(!fs.existsSync(dst))throw new Error(`Missing ${e.rel}`);
 const h=sha(dst);
 if(h!==e.before&&h!==e.after)throw new Error(`Refusing unexpected ${e.rel} SHA256: ${h}`);
 if(h===e.before){fs.copyFileSync(e.src,dst);changed=true;}
}
console.log(changed?"Applied V100.2.87 — iPad Session Resume Integrity.":"V100.2.87 already applied.");
