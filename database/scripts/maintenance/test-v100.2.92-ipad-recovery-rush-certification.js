"use strict";
const fs=require("fs"),path=require("path"),vm=require("vm");
let pass=0,total=0;
function ok(cond,msg){total++;if(cond){pass++;console.log("PASS:",msg)}else{console.error("FAIL:",msg);process.exitCode=1}}
function element(id){
  const attrs=new Map(),listeners={};
  return {
    id,hidden:false,dataset:{},textContent:"",disabled:false,
    setAttribute(k,v){attrs.set(k,String(v));},removeAttribute(k){attrs.delete(k);},hasAttribute(k){return attrs.has(k);},getAttribute(k){return attrs.has(k)?attrs.get(k):null;},
    addEventListener(n,fn){listeners[n]=fn;},querySelector(sel){return sel==="strong"?this._strong:sel==="span"?this._span:sel==="button"?this._button:null;},
    _listeners:listeners
  };
}
function makeHarness({connected=true,authenticated=true,refreshFails=false,sessionExpires=false,prelocked=false}={}){
  let hidden=true,visibility="hidden";
  let verifyCalls=0,meCalls=0,replayCalls=0,refreshCalls=0,renderCalls=0,resumeEvents=0,guardEvents=0,expireCalls=0,updateCalls=0;
  let resolver=null;
  const main=element("main");
  if(prelocked){main.setAttribute("inert","");main.setAttribute("aria-busy","external");main.dataset.bcResumeGuard="external";}
  const root=element("root"); if(prelocked)root.setAttribute("data-bc-resume-guard","external-root");
  const body={appendChild(node){nodes[node.id]=node;}};
  const nodes={main};
  const dl={},wl={};
  const document={
    get hidden(){return hidden;},get visibilityState(){return visibility;},documentElement:root,body,
    addEventListener(n,fn){dl[n]=fn;},getElementById(id){return nodes[id]||null;},
    createElement(){const b=element("");b._strong={textContent:""};b._span={textContent:""};b._button=element("button");Object.defineProperty(b,"innerHTML",{set(){b._button.id="bcResumeStateRetry";}});return b;}
  };
  class CE{constructor(type,opt={}){this.type=type;this.detail=opt.detail;}}
  let auth={authenticated,status:authenticated?"authenticated":"anonymous",session:authenticated?{user:{id:"u"}}:null};
  const api={async me(){meCalls++;if(sessionExpires){const e=new Error("expired");e.code="SESSION_EXPIRED";e.status=401;throw e;}return{organizationId:"org",role:"manager",user:{id:"u"}};}};
  const foundation={api,async refreshBootstrap(){refreshCalls++;if(refreshFails)throw new Error("refresh failed");}};
  const window={
    addEventListener(n,fn){wl[n]=fn;},dispatchEvent(e){if(e.type==="bluecurrent:app-resumed")resumeEvents++;if(e.type==="bluecurrent:resume-interaction-guard")guardEvents++;},
    requestAnimationFrame(fn){renderCalls++;setTimeout(fn,0);},
    BlueCurrentConnectivityTruth:{snapshot(){return{state:connected?"connected":"unreachable"};},async verify(){verifyCalls++;return{state:connected?"connected":"unreachable"};}},
    BlueCurrentOfflineSync:{snapshot(){return{queueDepth:3,openConflicts:0};},async replay(){replayCalls++;if(resolver)await resolver;}},
    BlueCurrentAuthSession:{snapshot(){return auth;},updateSession(session){updateCalls++;auth={authenticated:true,status:"authenticated",session};},expire(){expireCalls++;auth={authenticated:false,status:"anonymous",session:null};}},
    BlueCurrentStartupRegistry:{get(name){return name==="cloudFoundation"?foundation:null;}}
  };
  const sandbox={window,document,CustomEvent:CE,Date,Number,Object,Promise,console,setTimeout,clearTimeout};
  const src=fs.readFileSync(path.join(process.cwd(),"client/js/ipad-resume-truth-v100.2.86.js"),"utf8");
  vm.runInNewContext(src,sandbox);
  return {window,document,main,root,dl,wl,setVisible(){hidden=false;visibility="visible";},counts(){return{verifyCalls,meCalls,replayCalls,refreshCalls,renderCalls,resumeEvents,guardEvents,expireCalls,updateCalls};},setReplayGate(p){resolver=p;},setConnected(v){connected=v;},setRefreshFails(v){refreshFails=v;},setSessionExpires(v){sessionExpires=v;},setAuthenticated(v){auth=v?{authenticated:true,status:"authenticated",session:{user:{id:"u"}}}:{authenticated:false,status:"anonymous",session:null};}};
}
(async()=>{
 const f=path.join(process.cwd(),"client/js/ipad-resume-truth-v100.2.86.js"),src=fs.readFileSync(f,"utf8");
 ok(src.includes('const VERSION="100.2.91"'),"certifies exact V100.2.91 resume runtime");
 ok(src.includes("if(inFlight)return inFlight"),"overlapping resume calls are coalesced");
 ok(src.includes("now-lastResumeAt<750"),"rapid duplicate resume signals are suppressed");
 ok(src.includes('options.force'),"operator/auth recovery can explicitly bypass cooldown");
 ok(src.includes("waitForRenderCommit"),"render commit gate remains active");
 ok(src.includes("captureGuardOwnership"),"guard ownership capture remains active");
 ok(!src.includes("setInterval("),"no polling interval in certified runtime");
 ok(!src.includes("location.reload"),"no forced reload in certified runtime");

 const h=makeHarness();h.setVisible();
 const p1=h.window.BlueCurrentResumeTruth.resume("rush-a",{force:true});
 const p2=h.window.BlueCurrentResumeTruth.resume("rush-b",{force:true});
 await Promise.all([p1,p2]);
 let c=h.counts();
 ok(c.verifyCalls===1,"simultaneous resume verifies connectivity once");
 ok(c.meCalls===1,"simultaneous resume verifies session once");
 ok(c.replayCalls===1,"simultaneous resume replays queued writes once");
 ok(c.refreshCalls===1,"simultaneous resume refreshes shared state once");
 ok(c.renderCalls===1,"simultaneous resume commits one render frame");
 ok(c.resumeEvents===1,"simultaneous resume emits one completion event");
 ok(!h.main.hasAttribute("inert"),"successful fresh render releases normally unlocked surface");

 const locked=makeHarness({prelocked:true});locked.setVisible();
 await locked.window.BlueCurrentResumeTruth.resume("prelocked",{force:true});
 ok(locked.main.hasAttribute("inert"),"pre-existing inert lock survives recovery");
 ok(locked.main.getAttribute("aria-busy")==="external","pre-existing aria-busy value survives recovery");
 ok(locked.main.dataset.bcResumeGuard==="external","pre-existing guard metadata survives recovery");
 ok(locked.root.getAttribute("data-bc-resume-guard")==="external-root","pre-existing root guard metadata survives recovery");

 const badNet=makeHarness({connected:false});badNet.setVisible();
 const badNetResult=await badNet.window.BlueCurrentResumeTruth.resume("network-down",{force:true});
 c=badNet.counts();
 ok(c.meCalls===0&&c.replayCalls===0&&c.refreshCalls===0,"unreachable server blocks session, replay, and refresh");
 ok(badNet.main.hasAttribute("inert"),"unreachable server keeps operating surface guarded");
 ok(badNetResult.sharedStateRefreshed===false,"unreachable server never claims fresh shared state");

 const expired=makeHarness({sessionExpires:true});expired.setVisible();
 await expired.window.BlueCurrentResumeTruth.resume("expired",{force:true});
 c=expired.counts();
 ok(c.expireCalls===1,"expired session is retired exactly once");
 ok(c.replayCalls===0&&c.refreshCalls===0,"expired session blocks replay and refresh");
 ok(expired.main.hasAttribute("inert"),"expired session keeps live surface guarded");

 const refreshFail=makeHarness({refreshFails:true});refreshFail.setVisible();
 const failed=await refreshFail.window.BlueCurrentResumeTruth.resume("refresh-fail",{force:true});
 c=refreshFail.counts();
 ok(c.replayCalls===1&&c.refreshCalls===1,"verified session may replay before refresh attempt");
 ok(c.renderCalls===0,"failed state refresh does not claim render commit");
 ok(refreshFail.main.hasAttribute("inert"),"failed state refresh keeps surface guarded");
 ok(failed.renderCommitVerified===false,"failed refresh reports no render commit");

 const anon=makeHarness({authenticated:false});anon.setVisible();
 await anon.window.BlueCurrentResumeTruth.resume("anonymous",{force:true});
 c=anon.counts();
 ok(c.meCalls===0&&c.replayCalls===0&&c.refreshCalls===0,"anonymous resume never touches protected replay/state refresh");

 const rapid=makeHarness();rapid.setVisible();
 await rapid.window.BlueCurrentResumeTruth.resume("first",{force:true});
 const before=rapid.counts();
 const coalesced=await rapid.window.BlueCurrentResumeTruth.resume("second");
 const after=rapid.counts();
 ok(after.verifyCalls===before.verifyCalls,"post-completion rapid duplicate is cooldown-coalesced");
 ok(coalesced.coalesced===true,"cooldown-coalesced result is explicit");

 console.log(`V100.2.92 validation ${pass}/${total}`);if(pass!==total)process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
