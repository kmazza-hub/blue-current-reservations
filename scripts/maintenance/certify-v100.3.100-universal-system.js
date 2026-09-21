"use strict";

const {spawnSync}=require("child_process");
const path=require("path");
const root=path.resolve(__dirname,"../..");
const scripts=[
  "scripts/validate.js",
  "scripts/maintenance/test-v100.3.97-responsive-interaction-integrity.js",
  "scripts/maintenance/test-v100.3.98-holiday-reservation-book.js",
  "scripts/maintenance/test-v100.3.99-reservation-contrast.js",
  "scripts/maintenance/test-v100.3.100-universal-system-certification.js",
  "scripts/maintenance/test-v100.3.100-historical-test-classification.js",
  "scripts/maintenance/certify-v100.3.100-mock-restaurant-day.js",
  "scripts/maintenance/test-v100.3.100-frontline-api-performance.js"
];

for(const script of scripts){
  const result=spawnSync(process.execPath,[path.join(root,script)],{cwd:root,stdio:"inherit"});
  if(result.status!==0)process.exit(result.status||1);
}

console.log("V100.3.100 UNIVERSAL CURRENT SYSTEM CERTIFICATION PASSED.");
