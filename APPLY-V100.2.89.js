"use strict";
const fs=require("fs"),path=require("path"),crypto=require("crypto");
const root=process.cwd(),sha=p=>crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const entries=[
{rel:"client/js/ipad-resume-truth-v100.2.86.js",src:path.join(__dirname,"patches","client","js","ipad-resume-truth-v100.2.86.js"),before:"bf937007c3d2b7f767940ae382198bf64fd24cc1c49d40ae96ecf45b9280e5d6",after:"2d42cc4fa39a449f671bb4d7ccaf8909c0ee5663908266c13b90ee4cc71b23eb"},
{rel:"scripts/maintenance/test-v100.2.88-ipad-resume-state-rehydration-integrity.js",src:path.join(__dirname,"scripts","maintenance","test-v100.2.88-ipad-resume-state-rehydration-integrity.js"),before:"1df8ff129472316347f63b3b8824b63955263cb894a822090bbb97a1feea7e16",after:"11e2313fba20bfa700d234820f22b77ef57ab45463d4c1878c6373157b5b5b7f"},
{rel:"scripts/maintenance/test-v100.2.87-ipad-session-resume-integrity.js",src:path.join(__dirname,"scripts","maintenance","test-v100.2.87-ipad-session-resume-integrity.js"),before:"8869010bc54f688917291ee3c01571dff59e274fe8dfee8e01d9b246cf9ea500",after:"8ac0100174a81bcb3ec373ce1b629d8707f781dd1fb8a546f947fb4b670aac13"}
];
let changed=false;
for(const e of entries){const dst=path.join(root,e.rel);if(!fs.existsSync(dst))throw new Error(`Missing ${e.rel}`);const h=sha(dst);if(h!==e.before&&h!==e.after)throw new Error(`Refusing unexpected ${e.rel} SHA256: ${h}`);if(h===e.before){fs.copyFileSync(e.src,dst);changed=true;}}
const testRel="scripts/maintenance/test-v100.2.89-ipad-resume-interaction-guard.js",testDst=path.join(root,testRel),testSrc=path.join(__dirname,testRel);fs.copyFileSync(testSrc,testDst);
console.log(changed?"Applied V100.2.89 — iPad Resume Interaction Guard.":"V100.2.89 already applied.");
