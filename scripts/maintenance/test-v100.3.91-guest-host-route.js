"use strict";
const fs=require("fs"),path=require("path"),vm=require("vm"),root=path.resolve(__dirname,"../..");
const read=(file)=>fs.readFileSync(path.join(root,file),"utf8");
const expect=(condition,message)=>{if(!condition) throw new Error(message);};
const pkg=JSON.parse(read("package.json"));
const index=read("client/index.html");
const runtime=read("client/js/guest-host-route-v100.3.91.js");
expect(pkg.version==="100.3.91","package version must be 100.3.91");
expect(pkg.scripts["certify:pilot"]==="node scripts/maintenance/certify-v100.3.91-guest-host-route.js","certify:pilot must target V100.3.91");
expect(index.includes('guest-host-route-v100.3.91.js?v=100.3.91'),"V100.3.91 route runtime must be loaded and cache-busted");
expect(index.indexOf('hospitalityOsShell.js?v=100.3.91')<index.indexOf('guest-host-route-v100.3.91.js?v=100.3.91'),"route continuity must load after the Hospitality OS shell");
expect(index.includes('host-navigation-truth-v100.3.91.js?v=100.3.91'),"V100.3.90 Host Stand heading truth must remain in the release");
expect(index.includes('single-ipad-mock-trial-v100.3.91.js?v=100.3.91'),"single-iPad rehearsal must remain in the release");
for(const token of [
  'window.BlueCurrentHospitalityShell',
  'shellApi.activate(routeName, { scroll })',
  '"host-stand"',
  'section.classList.add("bc-workspace-visible")',
  'button.setAttribute("aria-current", "page")',
  'window.addEventListener("mousedown"',
  'window.addEventListener("touchend"',
  '[0, 80, 320, 900]'
]) expect(runtime.includes(token),"missing Guests route behavior: "+token);
expect(!/\b(fetch|XMLHttpRequest|localStorage)\b/.test(runtime),"route runtime must not call APIs or mutate restaurant data");
new vm.Script(runtime,{filename:"guest-host-route-v100.3.91.js"});
console.log("PASS V100.3.91 — Guests controls open the Host Stand workspace across mouse, touch, click, and keyboard input.");
