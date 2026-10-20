"use strict";
const {spawnSync}=require("node:child_process"),path=require("node:path"),root=path.resolve(__dirname,"../..");
for(const file of ["scripts/maintenance/test-v100.3.117-frank-manager-demo.js","scripts/maintenance/certify-v100.3.116-managed-protection.js"]){
 const result=spawnSync(process.execPath,[path.join(root,file)],{cwd:root,stdio:"inherit"});
 if(result.status!==0)process.exit(result.status||1);
}
console.log("V100.3.117 certification passed — Frank Koch fictional manager demo; credentials and authorization preserved.");
