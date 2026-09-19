"use strict";
const fs=require("fs"),path=require("path"),vm=require("vm"),root=path.resolve(__dirname,"../..");
const read=(file)=>fs.readFileSync(path.join(root,file),"utf8");
const expect=(condition,message)=>{if(!condition) throw new Error(message);};
const pkg=JSON.parse(read("package.json"));
const index=read("client/index.html");
const runtime=read("client/js/host-navigation-truth-v100.3.90.js");
expect(pkg.version==="100.3.90","package version must be 100.3.90");
expect(pkg.scripts["certify:pilot"]==="node scripts/maintenance/certify-v100.3.90-host-navigation-truth.js","certify:pilot must target V100.3.90");
expect(index.includes('host-navigation-truth-v100.3.90.js?v=100.3.90'),"V100.3.90 runtime must be loaded and cache-busted");
expect(index.includes('single-ipad-mock-trial-v100.3.90.js?v=100.3.90'),"certified single-iPad rehearsal must remain loaded");
for(const token of [
  'setText(heading, "Reservations")',
  'setText(heading, "Waitlist")',
  'setQueueView("arrivals")',
  'setQueueView("waitlist")',
  'button.setAttribute("aria-current", "page")',
  'button.setAttribute("aria-pressed", String(active))',
  'MutationObserver',
  'requestAnimationFrame(scheduleReconcile)'
]) expect(runtime.includes(token),"missing navigation-truth behavior: "+token);
expect(!/\b(fetch|XMLHttpRequest|localStorage|sessionStorage)\b/.test(runtime),"runtime must remain DOM-only and read-only");
new vm.Script(runtime,{filename:"host-navigation-truth-v100.3.90.js"});
console.log("PASS V100.3.90 — Host navigation labels, queues, and accessible selection stay synchronized.");
