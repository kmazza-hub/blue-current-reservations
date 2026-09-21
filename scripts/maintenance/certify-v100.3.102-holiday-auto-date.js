"use strict";

const {spawnSync}=require("child_process");
const path=require("path");
const root=path.resolve(__dirname,"../..");
const scripts=[
  "scripts/maintenance/certify-v100.3.101-ipad-host-return.js",
  "scripts/maintenance/test-v100.3.102-holiday-auto-date.js"
];

for(const script of scripts){
  const result=spawnSync(process.execPath,[path.join(root,script)],{cwd:root,stdio:"inherit"});
  if(result.status!==0)process.exit(result.status||1);
}

console.log("V100.3.102 UNIVERSAL CURRENT SYSTEM CERTIFICATION PASSED.");
