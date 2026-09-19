"use strict";
const {spawnSync}=require("child_process"),path=require("path"),root=path.resolve(__dirname,"../..");
for(const script of [
  "scripts/maintenance/certify-v100.3.90-host-navigation-truth.js",
  "scripts/maintenance/test-v100.3.91-guest-host-route.js"
]){
  const result=spawnSync(process.execPath,[path.join(root,script)],{cwd:root,stdio:"inherit"});
  if(result.status!==0) process.exit(result.status||1);
}
console.log("V100.3.91 Guests / Host Stand route certification passed.");
