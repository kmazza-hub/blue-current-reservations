"use strict";
const {spawnSync}=require("child_process"),path=require("path"),root=path.resolve(__dirname,"../..");
const result=spawnSync(process.execPath,[path.join(root,"scripts/maintenance/certify-v100.3.108-harbor-save-contrast.js")],{cwd:root,stdio:"inherit"});
if(result.status!==0)process.exit(result.status||1);
console.log("V100.3.109 UNIVERSAL CURRENT SYSTEM CERTIFICATION PASSED.");
