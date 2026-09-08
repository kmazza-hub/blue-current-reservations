"use strict";
const fs=require("fs");
const path=require("path");
const root=path.resolve(__dirname,"../..");
const shell=fs.readFileSync(path.join(root,"client/js/modules/hospitalityOsShell.js"),"utf8");
const checks=[
  ["shell version 100.2.0", /version:"100\.2\.0"/.test(shell)],
  ["authoritative coordinator controls presentation", /authoritativeAuthenticated=authSessionSnapshot\(\)\?\.authenticated===true/.test(shell)],
  ["authenticated session cannot render auth mode", /if\(authoritativeAuthenticated && mode==="auth"\)mode="ready";/.test(shell)],
  ["sign in CTA hidden while authenticated", /signIn\.hidden=authoritativeAuthenticated \|\| mode!=="auth";/.test(shell)],
  ["transport state also suppresses sign in CTA", /mode!=="auth"/.test(shell)],
  ["access panel still hides in ready state", /if\(mode==="ready"\)\{[\s\S]*?panel\.hidden=true;/.test(shell)],
  ["protected Command transport remains server authoritative", /return await api\.(?:request|transportRequest)\(url/.test(shell)]
];
const failed=checks.filter(([,ok])=>!ok).map(([name])=>name);
const result={ok:failed.length===0,repair:"V100.1.6 Command Auth Presentation Synchronization Hotfix",baselineVersion:"100.0.0",checks:checks.map(([name])=>name),failed};
console.log(JSON.stringify(result,null,2));
if(failed.length)process.exit(1);
