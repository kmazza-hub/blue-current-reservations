"use strict";
const fs=require("fs"),path=require("path"),vm=require("vm");
let p=0,t=0;function ok(c,m){t++;if(c){p++;console.log("PASS:",m)}else{console.error("FAIL:",m);process.exitCode=1}}
(async()=>{
const root=process.cwd(),html=fs.readFileSync(path.join(root,"client","index.html"),"utf8"),f=path.join(root,"client","js","ipad-resume-truth-v100.2.86.js"),src=fs.readFileSync(f,"utf8");
ok(html.includes("ipad-resume-truth-v100.2.86.js?v=100.2.86"),"resume truth module loaded");
ok(html.indexOf("network-connectivity-truth-v100.2.85.js")<html.indexOf("ipad-resume-truth-v100.2.86.js"),"connectivity verifier loads before resume module");
ok(src.includes('document.addEventListener("visibilitychange"'),"foreground visibility transition handled");
ok(src.includes('window.addEventListener("pageshow"'),"pageshow/BFCache resume handled");
ok(src.includes('BlueCurrentConnectivityTruth.verify'),"resume re-verifies Blue Current server");
ok(src.includes('connectivity?.state==="connected"'),"queued replay requires verified connected state");
ok(src.includes('BlueCurrentOfflineSync.replay'),"queued writes can replay after verified resume");
ok(src.includes('bluecurrent:app-resumed'),"resume lifecycle event emitted");
ok(src.includes('now-lastResumeAt<750'),"duplicate resume signals coalesced");
ok(!src.includes("setInterval("),"no interval introduced");
ok(!src.includes("MutationObserver"),"no observer introduced");
ok(!src.includes("location.reload"),"resume does not reload operator workspace");
ok(!src.includes("serviceWorker"),"resume adds no offline caching claim");

let visible="hidden",hidden=true,verifyCalls=0,replayCalls=0,resumeEvents=0;
const docListeners={},winListeners={};
const document={get hidden(){return hidden},get visibilityState(){return visible},addEventListener(n,fn){docListeners[n]=fn}};
class CE{constructor(type,opt={}){this.type=type;this.detail=opt.detail}}
const window={
 addEventListener(n,fn){winListeners[n]=fn},
 dispatchEvent(e){if(e.type==="bluecurrent:app-resumed")resumeEvents++},
 BlueCurrentConnectivityTruth:{snapshot(){return{state:"connected"}},async verify(){verifyCalls++;return{state:"connected"}}},
 BlueCurrentOfflineSync:{snapshot(){return{queueDepth:2,openConflicts:0}},async replay(){replayCalls++}}
};
const sandbox={window,document,CustomEvent:CE,Date,Number,Object,Promise,console,setTimeout,clearTimeout};
vm.runInNewContext(src,sandbox);
ok(typeof window.BlueCurrentResumeTruth?.resume==="function","resume API exposed");
hidden=false;visible="visible";docListeners.visibilitychange();
await new Promise(r=>setTimeout(r,0));
ok(verifyCalls===1,"hidden-to-visible transition triggers one server verification");
ok(replayCalls===1,"verified resume triggers queued-write replay");
ok(resumeEvents===1,"verified resume emits one lifecycle event");
await window.BlueCurrentResumeTruth.resume("manual-immediate");
ok(verifyCalls===1,"immediate duplicate resume is coalesced");
window.BlueCurrentConnectivityTruth.verify=async()=>{verifyCalls++;return{state:"unreachable"}};
await new Promise(r=>setTimeout(r,760));
await window.BlueCurrentResumeTruth.resume("unreachable-test");
ok(replayCalls===1,"unreachable server does not replay queued writes");
console.log(`V100.2.86 validation ${p}/${t}`);if(p!==t)process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
