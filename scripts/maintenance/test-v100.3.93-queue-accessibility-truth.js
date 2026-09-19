"use strict";
const fs=require("fs"),path=require("path"),vm=require("vm"),root=path.resolve(__dirname,"../..");
const read=(file)=>fs.readFileSync(path.join(root,file),"utf8");
const expect=(condition,message)=>{if(!condition) throw new Error(message);};
const pkg=JSON.parse(read("package.json"));
const index=read("client/index.html");
const runtime=read("client/js/accessibility-state-continuity-v100.3.93.js");
expect(pkg.version==="100.3.93","package version must be 100.3.93");
expect(pkg.scripts["certify:pilot"]==="node scripts/maintenance/certify-v100.3.93-queue-accessibility-truth.js","certify:pilot must target V100.3.93");
expect(index.includes('accessibility-state-continuity-v100.3.93.js?v=100.3.93'),"V100.3.93 accessibility runtime must be loaded and cache-busted");
for(const prior of [
  'host-navigation-truth-v100.3.93.js?v=100.3.93',
  'guest-host-route-v100.3.93.js?v=100.3.93',
  'single-ipad-mock-trial-v100.3.93.js?v=100.3.93'
]) expect(index.includes(prior),"prior certified runtime missing: "+prior);
for(const token of [
  'document.getElementById("waitlistQueue")',
  'document.getElementById("arrivalQueue")',
  '!waitlist.classList.contains("hidden")',
  'button.dataset.queue === selected',
  '"aria-pressed"',
  'setTimeout(scheduleReconcile, 900)',
  'attributeFilter: ["class", "hidden", "data-bc-workspace"]'
]) expect(runtime.includes(token),"missing semantic queue state behavior: "+token);
expect(!runtime.includes('String(button === active)'),"queue state must not derive from transient active classes");
expect(!/\b(fetch|XMLHttpRequest|localStorage|sessionStorage)\b/.test(runtime),"accessibility runtime must remain DOM-only");
new vm.Script(runtime,{filename:"accessibility-state-continuity-v100.3.93.js"});
console.log("PASS V100.3.93 — Waitlist and Arrivals accessibility states follow the visible queue.");
