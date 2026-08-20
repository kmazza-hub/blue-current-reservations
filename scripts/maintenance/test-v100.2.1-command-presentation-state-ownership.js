"use strict";
const fs=require("fs");
const path=require("path");
const root=path.resolve(__dirname,"../..");
const guard=fs.readFileSync(path.join(root,"client/js/modules/lightSurfaceContrastGuard.js"),"utf8");
const checks=[
  ["dark-surface selector exists",/DARK_SURFACE_SELECTOR/.test(guard)],
  ["Hospitality OS Command excluded from light contrast guard",/"#blueCurrentCommand"/.test(guard)],
  ["Hospitality OS shell class excluded from light contrast guard",/"\.bc-os-shell"/.test(guard)],
  ["explicit dark tone contract supported",/data-bc-surface-tone='dark'/.test(guard)],
  ["dark surface exit occurs before foreground/background contrast mutation",/if \(el\.closest\(DARK_SURFACE_SELECTOR\)\) return false;[\s\S]*const style = getComputedStyle\(el\)/.test(guard)],
  ["light-surface guard still toggles corrective class",/el\.classList\.toggle\(FIX_CLASS, shouldFix\)/.test(guard)],
  ["guard remains refreshable",/refresh:\(\) => schedule\(document\.body\)/.test(guard)]
];
const failed=checks.filter(([,ok])=>!ok).map(([name])=>name);
console.log(JSON.stringify({
  ok:failed.length===0,
  repair:"V100.2.1 Command Presentation State Ownership",
  baselineVersion:"100.0.0",
  checks:checks.map(([name])=>name),
  failed
},null,2));
if(failed.length) process.exit(1);
