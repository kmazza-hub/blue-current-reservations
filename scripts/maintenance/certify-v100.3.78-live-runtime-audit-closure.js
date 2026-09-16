"use strict";
const {spawnSync}=require("child_process"),path=require("path"),root=path.resolve(__dirname,"../..");
for(const script of ["scripts/maintenance/certify-v100.3.77-focus-navigation-readiness-state.js","scripts/maintenance/test-v100.3.78-live-runtime-audit-closure.js"]){console.log(`\n=== ${script} ===`);const result=spawnSync(process.execPath,[script],{cwd:root,stdio:"inherit"});if(result.status!==0)process.exit(result.status||1);}
console.log("\nV100.3.78 LIVE RUNTIME AUDIT CLOSURE CERTIFIED");
