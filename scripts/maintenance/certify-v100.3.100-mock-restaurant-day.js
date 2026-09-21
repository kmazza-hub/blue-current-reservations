"use strict";

const {spawnSync}=require("child_process");
const path=require("path");
const root=path.resolve(__dirname,"../..");
const scripts=[
  "scripts/maintenance/test-v100.3.38-operational-lifecycle-stress-certification.js",
  "scripts/maintenance/test-v100.3.39-frontline-failure-rush-stress-certification.js",
  "scripts/maintenance/test-v100.3.55-first-class-operating-lifecycle.js",
  "scripts/maintenance/test-v100.3.100-holiday-reservation-runtime.js"
];

for(const script of scripts){
  const result=spawnSync(process.execPath,[path.join(root,script)],{cwd:root,stdio:"inherit"});
  if(result.status!==0)process.exit(result.status||1);
}

console.log("V100.3.100 mock restaurant day certification passed.");
