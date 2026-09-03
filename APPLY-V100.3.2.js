"use strict";
const path=require("path"),{execFileSync}=require("child_process");
const test=path.join(__dirname,"scripts","maintenance","test-v100.3.2-human-operator-review-protocol.js");
execFileSync(process.execPath,[test],{cwd:process.cwd(),stdio:"inherit"});
console.log("Prepared V100.3.2 — Human Operator Review Protocol. Human observation is still required; no runtime files changed.");
