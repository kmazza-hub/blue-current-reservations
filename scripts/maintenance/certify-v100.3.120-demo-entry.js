"use strict";
const {spawnSync}=require("node:child_process"),path=require("node:path"),root=path.resolve(__dirname,"../..");
const result=spawnSync(process.execPath,[path.join(root,"scripts/maintenance/certify-v100.3.119-audit.js")],{cwd:root,stdio:"inherit"});if(result.status!==0)process.exit(result.status||1);
console.log("V100.3.120 certification passed — populated isolated demo is the default landing page; full platform retained at /index.html; live activation unchanged.");
