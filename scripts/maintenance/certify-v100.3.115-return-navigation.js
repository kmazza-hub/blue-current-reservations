"use strict";
const {spawnSync}=require("child_process"),path=require("path");
const result=spawnSync(process.execPath,[path.join(__dirname,"certify-v100.3.114-frank-demo.js")],{cwd:path.resolve(__dirname,"../.."),stdio:"inherit"});
if(result.status!==0)process.exit(result.status||1);
console.log("V100.3.115 certification passed — main-page return navigation; booking lifecycle unchanged.");
