"use strict";
const {spawnSync}=require("child_process"),path=require("path");
const root=path.resolve(__dirname,"../..");
for(const script of ["scripts/validate.js","scripts/maintenance/test-v100.3.54-authentication-handshake.js","scripts/maintenance/test-v100.3.55-first-class-operating-lifecycle.js"]){
  console.log(`\n=== ${script} ===`);
  const result=spawnSync(process.execPath,[path.join(root,script)],{cwd:root,stdio:"inherit"});
  if(result.status!==0){console.error(`PILOT CERTIFICATION BLOCKED: ${script}`);process.exit(result.status||1);}
}
console.log("\nV100.3.55 OPERATING FOUNDATION CERTIFIED");
