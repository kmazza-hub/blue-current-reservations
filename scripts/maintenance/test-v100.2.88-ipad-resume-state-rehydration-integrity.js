"use strict";
const fs=require("fs"),path=require("path");
let p=0,t=0;function ok(c,m){t++;if(c){p++;console.log("PASS:",m)}else{console.error("FAIL:",m);process.exitCode=1}}
const root=process.cwd(),f=path.join(root,"client","js","ipad-resume-truth-v100.2.86.js"),src=fs.readFileSync(f,"utf8");
ok(src.includes('const VERSION="100.2.88"')||src.includes('const VERSION="100.2.89"')||src.includes('const VERSION="100.2.90"'),"V100.2.88 resume lifecycle preserved or hardened");
ok(src.includes('refreshSharedState'),"shared-state rehydration step present");
ok(src.includes('foundation?.refreshBootstrap'),"existing Cloud Foundation bootstrap refresh reused");
ok(src.indexOf('await window.BlueCurrentOfflineSync.replay()')<src.indexOf('sharedState=await refreshSharedState(reason)'),"queued writes replay before shared-state refresh");
ok(src.includes('sharedStateRefreshed'),"resume result exposes shared-state freshness truth");
ok(src.includes('bootstrap-refresh-failed'),"shared-state refresh failure explicit");
ok(src.indexOf('verify(`resume:${reason}`)')<src.indexOf('session=await verifySession(reason)'),"connectivity remains before session verification");
ok(src.indexOf('session=await verifySession(reason)')<src.indexOf('await window.BlueCurrentOfflineSync.replay()'),"session remains before queued replay");
ok(src.includes('bluecurrent:app-resumed'),"resume lifecycle event preserved");
ok(!src.includes("setInterval("),"no polling introduced");
ok(!src.includes("location.reload"),"no forced reload introduced");
ok(!src.includes("serviceWorker"),"no offline caching claim introduced");
console.log(`V100.2.88 validation ${p}/${t}`);if(p!==t)process.exitCode=1;
