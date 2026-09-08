const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'../..');
const shell=fs.readFileSync(path.join(root,'client/js/modules/hospitalityOsShell.js'),'utf8');
const checks=[
  ['shell version 100.2.0', /version:"100\.2\.0"/.test(shell)],
  ['direct authenticated CloudApi transport used for Command', /return await api\.transportRequest\(url/.test(shell)],
  ['stale request pipeline bypass documented', /must not inherit stale[\s\S]*request-pipeline circuit\/backoff state/.test(shell)],
  ['bootstrap hydration reconciles Command connectivity', /bluecurrent:bootstrap-hydrated/.test(shell) && /reconcileCommandConnectivity/.test(shell)],
  ['cloud authenticated reconciles Command connectivity', /cloud:authenticated/.test(shell)],
  ['reconciliation clears transport backoff', /commandState\.transportBackoffUntil=0/.test(shell)],
  ['reconciliation forces Command refresh', /refreshCommand\(\{force:true\}\)/.test(shell)],
  ['authoritative auth presentation preserved', /auth-session coordinator is authoritative for presentation too/.test(shell)]
];
const failed=checks.filter(([,ok])=>!ok).map(([name])=>name);
const result={ok:failed.length===0,repair:'V100.1.6 Command Connectivity State Reconciliation Hotfix',baselineVersion:'100.0.0',checks:checks.map(([name])=>name),failed};
console.log(JSON.stringify(result,null,2));
if(!result.ok)process.exit(1);
