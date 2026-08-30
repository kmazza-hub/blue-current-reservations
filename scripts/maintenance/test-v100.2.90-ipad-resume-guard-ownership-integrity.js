"use strict";
const fs=require("fs"),path=require("path"),vm=require("vm");
let p=0,t=0;function ok(c,m){t++;if(c){p++;console.log("PASS:",m)}else{console.error("FAIL:",m);process.exitCode=1}}
(async()=>{
const root=process.cwd(),f=path.join(root,"client","js","ipad-resume-truth-v100.2.86.js"),src=fs.readFileSync(f,"utf8");
ok(src.includes('const VERSION="100.2.90"'),"resume lifecycle hardened to V100.2.90");
ok(src.includes("captureGuardOwnership"),"guard captures pre-existing interaction ownership");
ok(src.includes("restoreGuardOwnership"),"guard restores pre-existing interaction ownership");
ok(src.includes('mainHasInert'),"pre-existing inert ownership recorded");
ok(src.includes('mainHasBusy'),"pre-existing aria-busy ownership recorded");
ok(src.includes('mainDatasetHad'),"pre-existing guard dataset ownership recorded");
ok(src.includes('rootHad'),"pre-existing root guard metadata ownership recorded");
ok(src.includes('if(guardStatus==="idle")captureGuardOwnership()'),"ownership snapshot occurs once at guard acquisition");
ok(!src.includes("setInterval("),"no polling introduced");
ok(!src.includes("location.reload"),"no forced reload introduced");
ok(!src.includes("serviceWorker"),"no offline caching claim introduced");

function node(id){return{id,hidden:false,dataset:{},attrs:{},children:{},setAttribute(k,v){this.attrs[k]=String(v)},removeAttribute(k){delete this.attrs[k]},hasAttribute(k){return Object.prototype.hasOwnProperty.call(this.attrs,k)},getAttribute(k){return this.hasAttribute(k)?this.attrs[k]:null},querySelector(s){return this.children[s]||null},addEventListener(){}}}
let hidden=true,visible="hidden",refreshes=0,replays=0,meCalls=0;
const dl={},wl={},main=node("main"),elements={main};
const rootNode=node("html");
const body={appendChild(n){elements[n.id]=n;return n}};
const document={get hidden(){return hidden},get visibilityState(){return visible},body,documentElement:rootNode,addEventListener(n,fn){dl[n]=fn},getElementById(id){return elements[id]||null},createElement(){const n=node("");n.querySelector=()=>null;return n}};
class CE{constructor(type,opt={}){this.type=type;this.detail=opt.detail}}
let authState={authenticated:true,status:"authenticated",session:{user:{id:"u1"}}};
const api={async me(){meCalls++;return{organizationId:"org",role:"manager",user:{id:"u1"}}}};
const foundation={api,async refreshBootstrap(){refreshes++;return{reservations:[]}}};
const window={addEventListener(n,fn){wl[n]=fn},dispatchEvent(){},BlueCurrentConnectivityTruth:{snapshot(){return{state:"connected"}},async verify(){return{state:"connected"}}},BlueCurrentOfflineSync:{snapshot(){return{queueDepth:1,openConflicts:0}},async replay(){replays++}},BlueCurrentAuthSession:{snapshot(){return authState},updateSession(session){authState={authenticated:true,status:"authenticated",session}},expire(){authState={authenticated:false,status:"anonymous",session:null}}},BlueCurrentStartupRegistry:{get(name){return name==="cloudFoundation"?foundation:null}}};
const sandbox={window,document,CustomEvent:CE,Date,Number,Object,Promise,console,setTimeout,clearTimeout};
vm.runInNewContext(src,sandbox);
ok(typeof window.BlueCurrentResumeTruth?.resume==="function","resume API preserved");

// Pre-existing lock owned by another subsystem must survive a successful resume.
main.setAttribute("inert","");main.setAttribute("aria-busy","mixed");main.dataset.bcResumeGuard="other-owner";rootNode.setAttribute("data-bc-resume-guard","other-root-owner");
hidden=false;visible="visible";dl.visibilitychange();
await new Promise(r=>setTimeout(r,0));
ok(replays===1&&refreshes===1&&meCalls===1,"normal resume lifecycle still executes once");
ok(main.hasAttribute("inert"),"pre-existing inert lock survives resume release");
ok(main.getAttribute("aria-busy")==="mixed","pre-existing aria-busy value restored exactly");
ok(main.dataset.bcResumeGuard==="other-owner","pre-existing main guard metadata restored");
ok(rootNode.getAttribute("data-bc-resume-guard")==="other-root-owner","pre-existing root guard metadata restored");

// A surface that was unlocked before resume must return unlocked.
await new Promise(r=>setTimeout(r,760));
main.removeAttribute("inert");main.removeAttribute("aria-busy");delete main.dataset.bcResumeGuard;rootNode.removeAttribute("data-bc-resume-guard");
await window.BlueCurrentResumeTruth.resume("clean-surface");
ok(!main.hasAttribute("inert"),"resume-owned inert is removed from previously unlocked surface");
ok(!main.hasAttribute("aria-busy"),"resume-owned busy state is removed from previously unlocked surface");
ok(!Object.prototype.hasOwnProperty.call(main.dataset,"bcResumeGuard"),"resume-owned dataset marker is removed from previously clean surface");
ok(!rootNode.hasAttribute("data-bc-resume-guard"),"resume-owned root marker is removed from previously clean surface");

// Repeated blocked guard transitions must not overwrite the original ownership snapshot.
window.BlueCurrentResumeTruth.setInteractionGuard("checking","manual-a");
window.BlueCurrentResumeTruth.setInteractionGuard("blocked","manual-b");
window.BlueCurrentResumeTruth.releaseInteractionGuard("manual-release");
ok(!main.hasAttribute("inert"),"nested guard status changes do not invent inert ownership");
ok(!main.hasAttribute("aria-busy"),"nested guard status changes do not invent busy ownership");
console.log(`V100.2.90 validation ${p}/${t}`);if(p!==t)process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
