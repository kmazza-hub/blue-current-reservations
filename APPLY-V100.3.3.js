"use strict";
const path=require("path"),{execFileSync}=require("child_process");
const test=path.join(__dirname,"scripts","maintenance","test-v100.3.3-operator-review-evidence-integrity.js");
execFileSync(process.execPath,[test],{cwd:process.cwd(),stdio:"inherit"});
console.log("Prepared V100.3.3 — Operator Review Evidence Integrity. No runtime files changed.");
