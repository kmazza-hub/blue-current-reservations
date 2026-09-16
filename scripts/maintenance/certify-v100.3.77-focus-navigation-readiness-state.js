"use strict";
const {spawnSync}=require("child_process"),path=require("path"),root=path.resolve(__dirname,"../..");
for(const script of ["scripts/maintenance/certify-v100.3.76-live-audit-closure.js","scripts/maintenance/test-v100.3.77-focus-navigation-readiness-state.js"]){console.log(`\n=== ${script} ===`);const result=spawnSync(process.execPath,[script],{cwd:root,stdio:"inherit"});if(result.status!==0)process.exit(result.status||1);}
console.log("\nV100.3.77 FOCUS NAVIGATION AND READINESS STATE CERTIFIED");
