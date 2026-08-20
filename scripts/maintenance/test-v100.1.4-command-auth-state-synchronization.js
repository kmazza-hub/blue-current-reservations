"use strict";
const fs=require("fs");
const path=require("path");
const root=path.resolve(__dirname,"../..");
const shell=fs.readFileSync(path.join(root,"client/js/modules/hospitalityOsShell.js"),"utf8");
const checks=[
  ["shell version 100.1.4", /version:"100\.1\.4"/.test(shell)],
  ["hydrated user plus bearer token accepted", /if\(user&&token\)return true;/.test(shell)],
  ["coordinator still authoritative without live auth evidence", /if\(window\.BlueCurrentAuthSession\)return false;/.test(shell)],
  ["authenticatedUser state hydration listener registered", /bus\.on\("state:changed"/.test(shell)&&/payload\?\.key!=="authenticatedUser"/.test(shell)],
  ["hydration clears auth-required state", /commandState\.authRequired=false;/.test(shell)&&/setCommandAccessState\("ready"\)/.test(shell)],
  ["hydration triggers forced Command refresh", /refreshCommand\(\{force:true\}\);/.test(shell)],
  ["protected Command transport remains server authoritative", /return await api\.request\(url/.test(shell)]
];
const failed=checks.filter(([,ok])=>!ok).map(([name])=>name);
const result={ok:failed.length===0,repair:"V100.1.4 Command Auth State Synchronization Hotfix",baselineVersion:"100.0.0",checks:checks.map(([name])=>name),failed};
console.log(JSON.stringify(result,null,2));
if(failed.length)process.exit(1);
