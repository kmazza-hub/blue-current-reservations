"use strict";
const {spawnSync}=require("child_process"),path=require("path"),root=path.resolve(__dirname,"../..");
for(const script of ["scripts/maintenance/certify-v100.3.83-live-runtime-audit-closure.js","scripts/maintenance/test-v100.3.85-public-website-direct-call.js"]){
  console.log(`\n=== ${script} ===`);
  const result=spawnSync(process.execPath,[script],{cwd:root,stdio:"inherit"});
  if(result.status!==0)process.exit(result.status||1);
}
console.log("\nV100.3.85 PUBLIC WEBSITE DIRECT CALL CERTIFIED");
