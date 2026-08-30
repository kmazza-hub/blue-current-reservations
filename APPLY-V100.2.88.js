"use strict";
const fs=require("fs"),path=require("path"),crypto=require("crypto");
const root=process.cwd(),sha=p=>crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const entries=[
 {rel:"client/js/ipad-resume-truth-v100.2.86.js",src:path.join(__dirname,"patches","client","js","ipad-resume-truth-v100.2.86.js"),before:"dbfa762bb537899739c5c772148d46243f6ac3f0f65a35a11423678612ffdbac",after:"bf937007c3d2b7f767940ae382198bf64fd24cc1c49d40ae96ecf45b9280e5d6"},
 {rel:"scripts/maintenance/test-v100.2.87-ipad-session-resume-integrity.js",src:path.join(__dirname,"scripts","maintenance","test-v100.2.87-ipad-session-resume-integrity.js"),before:"bfc56cbf66acab0c5e2944ce0240505288f605a1b7403c9c7d7c10a1ead61ea3",after:"8869010bc54f688917291ee3c01571dff59e274fe8dfee8e01d9b246cf9ea500"}
];
let changed=false;
for(const e of entries){
 const dst=path.join(root,e.rel); if(!fs.existsSync(dst))throw new Error(`Missing ${e.rel}`);
 const h=sha(dst); if(h!==e.before&&h!==e.after)throw new Error(`Refusing unexpected ${e.rel} SHA256: ${h}`);
 if(h===e.before){fs.copyFileSync(e.src,dst);changed=true;}
}
console.log(changed?"Applied V100.2.88 — iPad Resume State Rehydration Integrity.":"V100.2.88 already applied.");
