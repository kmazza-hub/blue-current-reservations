"use strict";
const {spawnSync}=require("child_process"),path=require("path"),root=path.resolve(__dirname,"../..");
for(const script of [
  "scripts/maintenance/certify-v100.3.92-accessibility-state.js",
  "scripts/maintenance/test-v100.3.93-queue-accessibility-truth.js"
]){
  const result=spawnSync(process.execPath,[path.join(root,script)],{cwd:root,stdio:"inherit"});
  if(result.status!==0) process.exit(result.status||1);
}
console.log("V100.3.93 queue accessibility truth certification passed.");
