"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../..");
const pkg=require(path.join(root,"package.json"));
const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");
const runtime=fs.readFileSync(path.join(root,"client/js/single-ipad-mock-trial-v100.3.89.js"),"utf8");
let passed=0;
function check(name,value){assert.ok(value,name);passed++;console.log(`PASS: ${name}`);}
check("Build advances to V100.3.89",pkg.version==="100.3.89");
check("HTML publishes V100.3.89",html.includes('name="blue-current-build" content="100.3.89"'));
check("V100.3.89 runtime is published",html.includes("single-ipad-mock-trial-v100.3.89.js?v=100.3.89"));
check("Acknowledgement minimum overrides legacy important rule",runtime.includes('setProperty("min-height","44px","important")'));
check("Acknowledgement height is exactly 44px",runtime.includes('setProperty("height","44px","important")'));
check("Rehearsal launcher remains available",runtime.includes("Run single-iPad rehearsal"));
check("Sandbox still performs no API or storage writes",!runtime.includes("fetch(")&&!runtime.includes("localStorage")&&!runtime.includes("sessionStorage"));
check("Presentation-only contract remains explicit",runtime.includes('mode:"presentation-only"')&&runtime.includes("persistentWrites:false"));
console.log(`V100.3.89 touch target closure ${passed}/${passed}`);