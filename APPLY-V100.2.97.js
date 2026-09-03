"use strict";
const path=require("path"),{execFileSync}=require("child_process");
const test=path.join(__dirname,"scripts","maintenance","test-v100.2.97-ipad-device-hardening-certification.js");
execFileSync(process.execPath,[test],{cwd:process.cwd(),stdio:"inherit"});
console.log("Certified V100.2.97 — iPad Device Hardening. No runtime files changed.");
