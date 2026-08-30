"use strict";
const fs=require("fs"),path=require("path"),vm=require("vm");
let p=0,t=0;function ok(c,m){t++;if(c){p++;console.log("PASS:",m)}else{console.error("FAIL:",m);process.exitCode=1}}
(async()=>{
const root=process.cwd(),f=path.join(root,"client","js","ipad-resume-truth-v100.2.86.js"),src=fs.readFileSync(f,"utf8");
ok(src.includes('const VERSION="100.2.91"'),"resume lifecycle hardened to V100.2.91");
ok(src.includes("async function waitForRenderCommit"),"render-commit barrier present");
ok(src.includes('window.requestAnimationFrame'),"browser paint boundary used");
ok(src.includes('await waitForRenderCommit()'),"fresh state waits for render commit");
ok(src.includes('releaseInteractionGuard("fresh-state-rendered")'),"guard releases only after rendered fresh state");
ok(src.includes('renderCommitVerified'),"resume truth exposes render-commit result");
ok(src.includes('renderCommitMode'),"resume truth exposes render-commit mode");
ok(src.includes('mode:"task-fallback"'),"non-RAF fallback is explicit");
ok(!src.includes("setInterval("),"no polling introduced");
ok(!src.includes("location.reload"),"no forced reload introduced");
ok(!src.includes("serviceWorker"),"no offline caching claim introduced");
function node(id){return{id,hidden:false,dataset:{},attrs:{},children:{},setAttribute(k,v){this.attrs[k]=String(v)},removeAttribute(k){delete this.attrs[k]},hasAttribute(k){return Object.prototype.hasOwnProperty.call(this.attrs,k)},getAttribute(k){return this.hasAttribute(k)?this.attrs[k]:null},querySelector(s){return this.children[s]||null},addEventListener(){}}}
let hidden=true,visible="hidden",replays=0,meCalls=0,refreshes=0,resumeEvent=null;
const dl={},wl={},main=node("main"),rootNode=node("html"),elements={main};const body={appendChild(n){elements[n.id]=n;return n}};
const document={get hidden(){return hidden},get visibilityState(){return visible},body,documentElement:rootNode,addEventListener(n,fn){dl[n]=fn},getElementById(id){return elements[id]||null},createElement(){const n=node("");n.querySelector=()=>null;return n}};
class CE{constructor(type,opt={}){this.type=type;this.detail=opt.detail}}
let authState={authenticated:true,status:"authenticated",session:{user:{id:"u1"}}};
const frameQueue=[];let rendered=false,guardReleasedBeforeRender=false;
const foundation={api:{async me(){meCalls++;return{organizationId:"org",role:"manager",user:{id:"u1"}}}},async refreshBootstrap(){refreshes++;frameQueue.push(()=>{rendered=true});return{reservations:[]}}};
const window={requestAnimationFrame(fn){frameQueue.push(fn);return frameQueue.length},addEventListener(n,fn){wl[n]=fn},dispatchEvent(e){if(e.type==="bluecurrent:resume-interaction-guard"&&e.detail?.guarded===false&&!rendered)guardReleasedBeforeRender=true;if(e.type==="bluecurrent:app-resumed")resumeEvent=e.detail},BlueCurrentConnectivityTruth:{snapshot(){return{state:"connected"}},async verify(){return{state:"connected"}}},BlueCurrentOfflineSync:{snapshot(){return{queueDepth:1,openConflicts:0}},async replay(){replays++}},BlueCurrentAuthSession:{snapshot(){return authState},updateSession(session){authState={authenticated:true,status:"authenticated",session}},expire(){authState={authenticated:false,status:"anonymous",session:null}}},BlueCurrentStartupRegistry:{get(name){return name==="cloudFoundation"?foundation:null}}};
const sandbox={window,document,CustomEvent:CE,Date,Number,Object,Promise,console,setTimeout,clearTimeout};vm.runInNewContext(src,sandbox);
ok(typeof window.BlueCurrentResumeTruth?.waitForRenderCommit==="function","render-commit API exposed");
hidden=false;visible="visible";dl.visibilitychange();await new Promise(r=>setTimeout(r,0));
ok(main.hasAttribute("inert"),"operating surface remains guarded while paint is pending");
ok(refreshes===1&&replays===1&&meCalls===1,"normal resume data lifecycle reaches refresh once");
ok(frameQueue.length===2,"shared render and resume barrier are queued in order");
while(frameQueue.length){const fn=frameQueue.shift();fn();await Promise.resolve();}
await new Promise(r=>setTimeout(r,0));
ok(rendered,"shared-state render frame executed");
ok(!guardReleasedBeforeRender,"guard never releases before refreshed render commits");
ok(!main.hasAttribute("inert"),"previously unlocked surface releases after render commit");
ok(resumeEvent?.sharedStateRefreshed===true,"resume event confirms fresh shared state");
ok(resumeEvent?.renderCommitVerified===true,"resume event confirms rendered-state barrier");
ok(resumeEvent?.renderCommitMode==="animation-frame","resume event reports animation-frame commit");
await new Promise(r=>setTimeout(r,760));rendered=false;resumeEvent=null;foundation.refreshBootstrap=async()=>{refreshes++;throw new Error("refresh failed")};
const failed=window.BlueCurrentResumeTruth.resume("failed-refresh",{force:true});await new Promise(r=>setTimeout(r,0));while(frameQueue.length){const fn=frameQueue.shift();fn();await Promise.resolve();}await failed;
ok(main.hasAttribute("inert"),"refresh failure keeps operating surface guarded");
ok(resumeEvent?.renderCommitVerified===false,"failed refresh never falsely claims render commit");
console.log(`V100.2.91 validation ${p}/${t}`);if(p!==t)process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
