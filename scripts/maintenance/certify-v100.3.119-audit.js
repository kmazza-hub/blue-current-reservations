"use strict";
const {spawnSync}=require("node:child_process"),path=require("node:path"),root=path.resolve(__dirname,"../..");
for(const file of ["scripts/maintenance/test-v100.2.90-ipad-resume-guard-ownership-integrity.js","scripts/maintenance/test-v100.2.91-ipad-resume-render-commit-integrity.js","scripts/maintenance/certify-v100.3.118-working-shift-demo.js"]){
 const result=spawnSync(process.execPath,[path.join(root,file)],{cwd:root,stdio:"inherit"});if(result.status!==0)process.exit(result.status||1);
}
console.log("V100.3.119 certification passed — auth/resume handoff preserves active guards and releases completed sign-in locks.");
