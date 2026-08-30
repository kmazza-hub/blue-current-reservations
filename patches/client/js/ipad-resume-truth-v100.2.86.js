(function(){
"use strict";
const VERSION="100.2.87";
let wasHidden=document.hidden;
let lastResumeAt=0;
let inFlight=null;

function snapshot(extra={}){
  const sync=window.BlueCurrentOfflineSync?.snapshot?.();
  const auth=window.BlueCurrentAuthSession?.snapshot?.();
  return Object.freeze({
    version:VERSION,
    hidden:document.hidden,
    lastResumeAt:lastResumeAt?new Date(lastResumeAt).toISOString():null,
    connectivity:window.BlueCurrentConnectivityTruth?.snapshot?.()||null,
    authenticated:Boolean(auth?.authenticated),
    sessionStatus:auth?.status||"unknown",
    queuedWrites:Number(sync?.queueDepth||0),
    openConflicts:Number(sync?.openConflicts||0),
    ...extra
  });
}

function cloudApi(){
  return window.BlueCurrentStartupRegistry?.get?.("cloudFoundation")?.api||null;
}

async function verifySession(reason="resume"){
  const coordinator=window.BlueCurrentAuthSession;
  const current=coordinator?.snapshot?.();
  if(!current?.authenticated){
    return {verified:false,status:current?.status||"anonymous",reason:"not-authenticated"};
  }
  const api=cloudApi();
  if(!api?.me){
    return {verified:false,status:"unverified",reason:"auth-api-unavailable"};
  }
  try{
    const session=await api.me();
    coordinator?.updateSession?.(session);
    return {verified:true,status:"authenticated",session,reason};
  }catch(error){
    const expired=error?.code==="SESSION_EXPIRED"||error?.code==="AUTH_REQUIRED"||Number(error?.status)===401;
    if(expired&&coordinator?.snapshot?.().authenticated){
      coordinator?.expire?.({reason:error?.message||"Session expired.",path:"/api/auth/me"});
    }
    return {
      verified:false,
      status:expired?"expired":"unverified",
      reason:expired?"session-expired":"session-check-failed",
      error:String(error?.message||error)
    };
  }
}

async function resume(reason="foreground"){
  const now=Date.now();
  if(inFlight)return inFlight;
  if(now-lastResumeAt<750)return snapshot({reason,coalesced:true});
  lastResumeAt=now;
  inFlight=(async()=>{
    let connectivity=window.BlueCurrentConnectivityTruth?.snapshot?.()||null;
    if(window.BlueCurrentConnectivityTruth?.verify){
      connectivity=await window.BlueCurrentConnectivityTruth.verify(`resume:${reason}`);
    }

    let session={verified:false,status:"not-checked",reason:"server-unverified"};
    let replayed=false;

    if(connectivity?.state==="connected"){
      session=await verifySession(reason);
      if(session.verified&&window.BlueCurrentAuthSession?.snapshot?.().authenticated&&window.BlueCurrentOfflineSync?.replay){
        await window.BlueCurrentOfflineSync.replay();
        replayed=true;
      }
    }

    const detail=snapshot({
      reason,
      replayed,
      sessionVerified:Boolean(session.verified),
      sessionResumeStatus:session.status,
      sessionResumeReason:session.reason
    });
    window.dispatchEvent(new CustomEvent("bluecurrent:app-resumed",{detail}));
    return detail;
  })().finally(()=>{inFlight=null;});
  return inFlight;
}

document.addEventListener("visibilitychange",()=>{
  const hidden=document.hidden;
  if(wasHidden&&!hidden)resume("visibility");
  wasHidden=hidden;
});
window.addEventListener("pageshow",event=>{
  if(event.persisted||document.visibilityState==="visible")resume(event.persisted?"pageshow-bfcache":"pageshow");
});
window.BlueCurrentResumeTruth={version:VERSION,snapshot,resume,verifySession};
})();