"use strict";
const fs=require("fs"),path=require("path"),vm=require("vm");
let p=0,t=0;function ok(c,m){t++;if(c){p++;console.log("PASS:",m)}else{console.error("FAIL:",m);process.exitCode=1}}
(async()=>{
const root=process.cwd(),f=path.join(root,"client","js","ipad-resume-truth-v100.2.86.js"),src=fs.readFileSync(f,"utf8");
ok(src.includes('const VERSION="100.2.88"'),"resume lifecycle hardened to V100.2.88");
ok(src.includes('refreshSharedState'),"shared-state rehydration step present");
ok(src.includes('foundation?.refreshBootstrap'),"existing Cloud Foundation bootstrap refresh reused");
ok(src.indexOf('await window.BlueCurrentOfflineSync.replay()')<src.indexOf('sharedState=await refreshSharedState(reason)'),"queued writes replay before shared-state refresh");
ok(src.includes('sharedStateRefreshed'),"resume result exposes shared-state freshness truth");
ok(src.includes('bootstrap-refresh-failed'),"shared-state refresh failure explicit");
ok(!src.includes("setInterval("),"no polling introduced");
ok(!src.includes("location.reload"),"no forced reload introduced");
ok(!src.includes("serviceWorker"),"no offline caching claim introduced");

let hidden=true,visible="hidden",verifyCalls=0,meCalls=0,replays=0,refreshes=0,events=0;
const order=[],dl={},wl={};
const document={get hidden(){return hidden},get visibilityState(){return visible},addEventListener(n,fn){dl[n]=fn}};
class CE{constructor(type,opt={}){this.type=type;this.detail=opt.detail}}
let authState={authenticated:true,status:"authenticated",session:{user:{id:"u1"}}};
const api={async me(){meCalls++;order.push("session");return{organizationId:"org",role:"manager",user:{id:"u1"}}}};
const foundation={api,async refreshBootstrap(){refreshes++;order.push("refresh");return{reservations:[]}}};
const window={
 addEventListener(n,fn){wl[n]=fn},
 dispatchEvent(e){if(e.type==="bluecurrent:app-resumed"){events++;order.push("resumed")}},
 BlueCurrentConnectivityTruth:{snapshot(){return{state:"connected"}},async verify(){verifyCalls++;order.push("connectivity");return{state:"connected"}}},
 BlueCurrentOfflineSync:{snapshot(){return{queueDepth:2,openConflicts:0}},async replay(){replays++;order.push("replay")}},
 BlueCurrentAuthSession:{snapshot(){return authState},updateSession(session){authState={authenticated:true,status:"authenticated",session}},expire(){authState={authenticated:false,status:"anonymous",session:null}}},
 BlueCurrentStartupRegistry:{get(name){return name==="cloudFoundation"?foundation:null}}
};
const sandbox={window,document,CustomEvent:CE,Date,Number,Object,Promise,console,setTimeout,clearTimeout};
vm.runInNewContext(src,sandbox);
ok(typeof window.BlueCurrentResumeTruth?.refreshSharedState==="function","shared-state refresh API exposed");
hidden=false;visible="visible";dl.visibilitychange();
await new Promise(r=>setTimeout(r,0));
ok(verifyCalls===1,"foreground resume verifies server once");
ok(meCalls===1,"foreground resume verifies session once");
ok(replays===1,"verified resume replays queued writes once");
ok(refreshes===1,"verified resume refreshes shared state once");
ok(events===1,"resume lifecycle event emitted once");
ok(order.join(",")==="connectivity,session,replay,refresh,resumed","resume order is connectivity -> session -> replay -> refresh -> resumed");
const snap=await window.BlueCurrentResumeTruth.resume("coalesced");
ok(snap.coalesced===true,"duplicate immediate resume remains coalesced");
await new Promise(r=>setTimeout(r,760));
foundation.refreshBootstrap=async()=>{refreshes++;throw new Error("bootstrap unavailable")};
const failed=await window.BlueCurrentResumeTruth.resume("refresh-failure");
ok(failed.sharedStateRefreshed===false,"refresh failure does not falsely claim fresh state");
ok(failed.sharedStateResumeStatus==="failed","refresh failure status explicit");
ok(events===2,"failed refresh still completes resume lifecycle signal");
await new Promise(r=>setTimeout(r,760));
authState={authenticated:false,status:"anonymous",session:null};
const anonymous=await window.BlueCurrentResumeTruth.resume("anonymous");
ok(anonymous.sharedStateResumeStatus==="not-checked","anonymous resume does not refresh protected state");
ok(refreshes===2,"anonymous resume does not call bootstrap refresh");
console.log(`V100.2.88 validation ${p}/${t}`);if(p!==t)process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
