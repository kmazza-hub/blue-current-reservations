"use strict";
const {spawnSync}=require("child_process");
const path=require("path");
const root=path.resolve(__dirname,"../..");
for(const script of ["scripts/maintenance/certify-v100.3.104-details-contrast.js","scripts/maintenance/test-v100.3.105-harbor-point-demo.js"]){
  const result=spawnSync(process.execPath,[path.join(root,script)],{cwd:root,stdio:"inherit"});
  if(result.status!==0)process.exit(result.status||1);
}
console.log("V100.3.105 UNIVERSAL CURRENT SYSTEM CERTIFICATION PASSED.");
