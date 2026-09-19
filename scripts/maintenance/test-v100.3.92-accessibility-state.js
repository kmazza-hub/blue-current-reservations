"use strict";
const fs=require("fs"),path=require("path"),vm=require("vm"),root=path.resolve(__dirname,"../..");
const read=(file)=>fs.readFileSync(path.join(root,file),"utf8");
const expect=(condition,message)=>{if(!condition) throw new Error(message);};
const pkg=JSON.parse(read("package.json"));
const index=read("client/index.html");
const runtime=read("client/js/accessibility-state-continuity-v100.3.92.js");
expect(pkg.version==="100.3.92","package version must be 100.3.92");
expect(pkg.scripts["certify:pilot"]==="node scripts/maintenance/certify-v100.3.92-accessibility-state.js","certify:pilot must target V100.3.92");
expect(index.includes('accessibility-state-continuity-v100.3.92.js?v=100.3.92'),"V100.3.92 accessibility runtime must be loaded and cache-busted");
expect(index.indexOf('guest-host-route-v100.3.92.js?v=100.3.92')<index.indexOf('accessibility-state-continuity-v100.3.92.js?v=100.3.92'),"accessibility continuity must load after the route runtime");
for(const prior of [
  'host-navigation-truth-v100.3.92.js?v=100.3.92',
  'guest-host-route-v100.3.92.js?v=100.3.92',
  'single-ipad-mock-trial-v100.3.92.js?v=100.3.92'
]) expect(index.includes(prior),"prior certified runtime missing: "+prior);
for(const token of [
  '".bc-os-nav [data-bc-workspace]"',
  '".host-nav button"',
  '".host-queue-panel .queue-tabs"',
  '"aria-current"',
  '"aria-pressed"',
  '"page"',
  'MutationObserver',
  'requestAnimationFrame(reconcile)'
]) expect(runtime.includes(token),"missing accessibility behavior: "+token);
expect(!/\b(fetch|XMLHttpRequest|localStorage|sessionStorage)\b/.test(runtime),"accessibility runtime must be DOM-only");
new vm.Script(runtime,{filename:"accessibility-state-continuity-v100.3.92.js"});
console.log("PASS V100.3.92 — Primary workspace and queue selection expose persistent accessible state.");
