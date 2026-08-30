"use strict";
const fs=require("fs"),path=require("path"),vm=require("vm");
let p=0,t=0;function ok(c,m){t++;if(c){p++;console.log("PASS:",m)}else{console.error("FAIL:",m);process.exitCode=1}}
(async()=>{
const root=process.cwd(),f=path.join(root,"client","js","ipad-resume-truth-v100.2.86.js"),src=fs.readFileSync(f,"utf8");
ok(src.includes('const VERSION="100.2.87"'),"resume lifecycle hardened to V100.2.87");
ok(src.includes('BlueCurrentStartupRegistry?.get?.("cloudFoundation")?.api'),"existing Cloud API instance reused");
ok(src.includes('await api.me()'),"resume validates authenticated session");
ok(src.includes('coordinator?.updateSession?.(session)'),"verified session refreshes coordinator truth");
ok(src.includes('session.verified&&window.BlueCurrentAuthSession?.snapshot?.().authenticated'),"replay requires verified authenticated session");
ok(src.includes('SESSION_EXPIRED'),"expired-session outcome explicit");
ok(src.includes('AUTH_REQUIRED'),"authentication-required outcome explicit");
ok(src.includes('sessionVerified'),"resume result exposes session verification truth");
ok(!src.includes("setInterval("),"no session polling introduced");
ok(!src.includes("location.reload"),"session resume does not reload workspace");
ok(!src.includes("serviceWorker"),"no offline caching claim introduced");

let hidden=true,visible="hidden",verifyCalls=0,meCalls=0,replays=0,updates=0,expires=0,resumeEvents=0;
const dl={},wl={};
const document={get hidden(){return hidden},get visibilityState(){return visible},addEventListener(n,fn){dl[n]=fn}};
class CE{constructor(type,opt={}){this.type=type;this.detail=opt.detail}}
let authState={authenticated:true,status:"authenticated",session:{user:{id:"u1"}}};
const api={async me(){meCalls++;return{organizationId:"org",role:"manager",user:{id:"u1"}}}};
const window={
 addEventListener(n,fn){wl[n]=fn},
 dispatchEvent(e){if(e.type==="bluecurrent:app-resumed")resumeEvents++},
 BlueCurrentConnectivityTruth:{snapshot(){return{state:"connected"}},async verify(){verifyCalls++;return{state:"connected"}}},
 BlueCurrentOfflineSync:{snapshot(){return{queueDepth:2,openConflicts:0}},async replay(){replays++}},
 BlueCurrentAuthSession:{
   snapshot(){return authState},
   updateSession(session){updates++;authState={authenticated:true,status:"authenticated",session}},
   expire(){expires++;authState={authenticated:false,status:"anonymous",session:null}}
 },
 BlueCurrentStartupRegistry:{get(name){return name==="cloudFoundation"?{api}:null}}
};
const sandbox={window,document,CustomEvent:CE,Date,Number,Object,Promise,console,setTimeout,clearTimeout};
vm.runInNewContext(src,sandbox);
ok(typeof window.BlueCurrentResumeTruth?.verifySession==="function","session verifier API exposed");
hidden=false;visible="visible";dl.visibilitychange();
await new Promise(r=>setTimeout(r,0));
ok(verifyCalls===1,"foreground resume verifies server once");
ok(meCalls===1,"foreground resume verifies session once");
ok(updates===1,"valid session refreshes coordinator once");
ok(replays===1,"valid verified session permits queued replay");
ok(resumeEvents===1,"resume lifecycle event still emitted");

await new Promise(r=>setTimeout(r,760));
authState={authenticated:true,status:"authenticated",session:{user:{id:"u1"}}};
api.me=async()=>{meCalls++;const e=new Error("expired");e.code="SESSION_EXPIRED";e.status=401;throw e};
await window.BlueCurrentResumeTruth.resume("expired-test");
ok(expires===1,"expired resume session is expired in coordinator");
ok(replays===1,"expired session blocks queued replay");

await new Promise(r=>setTimeout(r,760));
authState={authenticated:false,status:"anonymous",session:null};
api.me=async()=>{meCalls++;return{}};
await window.BlueCurrentResumeTruth.resume("anonymous-test");
ok(meCalls===2,"anonymous resume does not call auth/me");
ok(replays===1,"anonymous resume does not replay queued writes");

console.log(`V100.2.87 validation ${p}/${t}`);if(p!==t)process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
