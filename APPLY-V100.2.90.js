"use strict";
const fs=require("fs"),path=require("path"),crypto=require("crypto");
const root=process.cwd(),sha=p=>crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const entries=[
{rel:"client/js/ipad-resume-truth-v100.2.86.js",src:path.join(__dirname,...["patches", "client", "js", "ipad-resume-truth-v100.2.86.js"]),before:"2d42cc4fa39a449f671bb4d7ccaf8909c0ee5663908266c13b90ee4cc71b23eb",after:"5c3c1bc31d0ff297c195d292aac8142adaa114570b715ce95f14aa361a728847"},
{rel:"scripts/maintenance/test-v100.2.89-ipad-resume-interaction-guard.js",src:path.join(__dirname,...["scripts", "maintenance", "test-v100.2.89-ipad-resume-interaction-guard.js"]),before:"607c6b22b086bdd93670f1fadec4faec8a541491e01be094a4e8482ddc0479a0",after:"1e26150bfa9ce29d9fcacda5c0a8783b96404916238973978f36d2b145bb0ff5"},
{rel:"scripts/maintenance/test-v100.2.88-ipad-resume-state-rehydration-integrity.js",src:path.join(__dirname,...["scripts", "maintenance", "test-v100.2.88-ipad-resume-state-rehydration-integrity.js"]),before:"11e2313fba20bfa700d234820f22b77ef57ab45463d4c1878c6373157b5b5b7f",after:"89be3ffef82b2e66dee3230b922f033afd64e34aef17c18ccbb622938a3d308d"},
{rel:"scripts/maintenance/test-v100.2.87-ipad-session-resume-integrity.js",src:path.join(__dirname,...["scripts", "maintenance", "test-v100.2.87-ipad-session-resume-integrity.js"]),before:"8ac0100174a81bcb3ec373ce1b629d8707f781dd1fb8a546f947fb4b670aac13",after:"732e62451762ea1770d59a204d2871656835e4c539ea2a765aff4551bea4fef3"}
];
let changed=false;
for(const e of entries){const dst=path.join(root,e.rel);if(!fs.existsSync(dst))throw new Error(`Missing ${e.rel}`);const h=sha(dst);if(h!==e.before&&h!==e.after)throw new Error(`Refusing unexpected ${e.rel} SHA256: ${h}`);if(h===e.before){fs.copyFileSync(e.src,dst);changed=true;}}
console.log(changed?"Applied V100.2.90 — iPad Resume Guard Ownership Integrity.":"V100.2.90 already applied.");
