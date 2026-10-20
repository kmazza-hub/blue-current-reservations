"use strict";
const {spawnSync}=require("node:child_process"),path=require("node:path"),root=path.resolve(__dirname,"../..");
for(const file of ["scripts/maintenance/test-v100.3.118-working-shift-demo.js","scripts/maintenance/test-v100.3.118-working-shift-api.js","scripts/maintenance/certify-v100.3.117-frank-manager-demo.js"]){
 const result=spawnSync(process.execPath,[path.join(root,file)],{cwd:root,stdio:"inherit"});if(result.status!==0)process.exit(result.status||1);
}
console.log("V100.3.118 certification passed — isolated connected working shift demo; live activation unchanged.");
