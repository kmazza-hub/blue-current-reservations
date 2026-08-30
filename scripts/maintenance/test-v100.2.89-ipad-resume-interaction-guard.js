"use strict";
const fs=require("fs"),path=require("path"),vm=require("vm");
let p=0,t=0;function ok(c,m){t++;if(c){p++;console.log("PASS:",m)}else{console.error("FAIL:",m);process.exitCode=1}}
(async()=>{
const root=process.cwd(),f=path.join(root,"client","js","ipad-resume-truth-v100.2.86.js"),src=fs.readFileSync(f,"utf8");
ok(/const VERSION="100\.2\.(89|90)"/.test(src),"resume lifecycle hardened to V100.2.89");
ok(src.includes('setInteractionGuard'),"resume interaction guard present");
ok(src.includes('releaseInteractionGuard'),"resume interaction release present");
ok(src.includes('main.setAttribute?.("inert","")'),"live main surface becomes inert while state is unverified");
ok(src.includes('main.setAttribute?.("aria-busy","true")'),"guarded surface exposes busy state");
ok(src.includes('main.removeAttribute?.("inert")'),"fresh state releases inert guard");
ok(src.includes('sharedState.refreshed'),"fresh shared state owns release decision");
ok(src.includes('guardStatus==="auth-required"'),"authentication recovery state explicit");
ok(src.includes('resume("session-restored",{force:true})'),"successful re-authentication re-runs resume verification");
ok(src.includes('bcResumeStateGuard'),"existing recovery-banner pattern reused for guard status");
ok(!src.includes("setInterval("),"no polling introduced");
ok(!src.includes("location.reload"),"no forced reload introduced");
ok(!src.includes("serviceWorker"),"no offline caching claim introduced");

let hidden=true,visible="hidden",verifyCalls=0,meCalls=0,replays=0,refreshes=0,resumeEvents=0,guardEvents=0;
const dl={},wl={};
function makeNode(id){return {id,hidden:false,dataset:{},attrs:{},children:{},setAttribute(k,v){this.attrs[k]=v},removeAttribute(k){delete this.attrs[k]},querySelector(sel){return this.children[sel]||null},addEventListener(){}}}
const main=makeNode("main"),banner=makeNode("bcResumeStateGuard"),strong=makeNode("strong"),span=makeNode("span"),button=makeNode("button");banner.children={strong,span,button};banner.querySelector=s=>banner.children[s]||null;
const elements={main};
const body={appendChild(node){elements[node.id]=node;return node}};
const document={
 get hidden(){return hidden},get visibilityState(){return visible},body,
 documentElement:{attrs:{},setAttribute(k,v){this.attrs[k]=v},removeAttribute(k){delete this.attrs[k]}},
 addEventListener(n,fn){dl[n]=fn},getElementById(id){return elements[id]||null},
 createElement(){const n=makeNode("");n.querySelector=()=>null;return n}
};
class CE{constructor(type,opt={}){this.type=type;this.detail=opt.detail}}
let authState={authenticated:true,status:"authenticated",session:{user:{id:"u1"}}};
const api={async me(){meCalls++;return{organizationId:"org",role:"manager",user:{id:"u1"}}}};
let failRefresh=false;
const foundation={api,async refreshBootstrap(){refreshes++;if(failRefresh)throw new Error("refresh failed");return{reservations:[]}}};
const window={
 addEventListener(n,fn){wl[n]=fn},dispatchEvent(e){if(e.type==="bluecurrent:app-resumed")resumeEvents++;if(e.type==="bluecurrent:resume-interaction-guard")guardEvents++},
 BlueCurrentConnectivityTruth:{snapshot(){return{state:"connected"}},async verify(){verifyCalls++;return{state:"connected"}}},
 BlueCurrentOfflineSync:{snapshot(){return{queueDepth:1,openConflicts:0}},async replay(){replays++}},
 BlueCurrentAuthSession:{snapshot(){return authState},updateSession(session){authState={authenticated:true,status:"authenticated",session}},expire(){authState={authenticated:false,status:"anonymous",session:null}}},
 BlueCurrentStartupRegistry:{get(name){return name==="cloudFoundation"?foundation:null}}
};
const sandbox={window,document,CustomEvent:CE,Date,Number,Object,Promise,console,setTimeout,clearTimeout};
vm.runInNewContext(src,sandbox);
ok(typeof window.BlueCurrentResumeTruth?.setInteractionGuard==="function","interaction-guard API exposed");
hidden=false;visible="visible";dl.visibilitychange();
ok(main.attrs.inert==="","main is guarded synchronously when authenticated iPad resumes");
ok(main.attrs["aria-busy"]==="true","main is marked busy during resume");
await new Promise(r=>setTimeout(r,0));
ok(verifyCalls===1&&meCalls===1&&replays===1&&refreshes===1,"resume completes verify -> session -> replay -> refresh once");
ok(!("inert" in main.attrs),"fresh shared state releases main interaction guard");
ok(!("aria-busy" in main.attrs),"fresh shared state clears busy state");
ok(resumeEvents===1,"successful resume emits lifecycle event once");

await new Promise(r=>setTimeout(r,760));
failRefresh=true;
const failed=await window.BlueCurrentResumeTruth.resume("refresh-failure");
ok(failed.sharedStateRefreshed===false,"refresh failure remains explicit");
ok(main.attrs.inert==="","refresh failure keeps live surface guarded");
ok(main.attrs["aria-busy"]==="true","failed refresh keeps busy truth visible");
ok(failed.interactionGuardActive===true,"failed resume snapshot reports active interaction guard");

failRefresh=false;
await window.BlueCurrentResumeTruth.resume("operator-retry",{force:true});
ok(!("inert" in main.attrs),"successful forced retry releases guard");
ok(window.BlueCurrentResumeTruth.snapshot().interactionGuardActive===false,"snapshot reports guard released after fresh state");
ok(guardEvents>=4,"guard lifecycle emits observable state changes");
console.log(`V100.2.89 validation ${p}/${t}`);if(p!==t)process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
