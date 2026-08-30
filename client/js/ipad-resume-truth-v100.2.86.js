(function(){
"use strict";
const VERSION="100.2.89";
let wasHidden=document.hidden;
let lastResumeAt=0;
let inFlight=null;
let guardStatus="idle";
let guardReason=null;

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
    interactionGuardActive:guardStatus!=="idle",
    interactionGuardStatus:guardStatus,
    interactionGuardReason:guardReason,
    ...extra
  });
}

function cloudFoundation(){
  return window.BlueCurrentStartupRegistry?.get?.("cloudFoundation")||null;
}

function cloudApi(){
  return cloudFoundation()?.api||null;
}

function mainSurface(){
  return document.getElementById?.("main")||null;
}

function ensureGuardBanner(){
  if(!document.body?.appendChild||!document.createElement)return null;
  let banner=document.getElementById?.("bcResumeStateGuard");
  if(banner)return banner;
  banner=document.createElement("aside");
  banner.id="bcResumeStateGuard";
  banner.className="bc-recovery-banner";
  banner.hidden=true;
  banner.setAttribute("role","status");
  banner.setAttribute("aria-live","polite");
  banner.innerHTML=`<div><strong>Refreshing live restaurant state</strong><span>Blue Current is verifying this iPad before accepting new actions.</span></div><button type="button" id="bcResumeStateRetry">Retry now</button>`;
  document.body.appendChild(banner);
  banner.querySelector?.("button")?.addEventListener?.("click",()=>resume("operator-retry",{force:true}));
  return banner;
}

function setInteractionGuard(status="checking",reason="resume"){
  guardStatus=status;
  guardReason=reason;
  const main=mainSurface();
  if(main){
    main.setAttribute?.("inert","");
    main.setAttribute?.("aria-busy","true");
    main.dataset&&(main.dataset.bcResumeGuard=status);
  }
  document.documentElement?.setAttribute?.("data-bc-resume-guard",status);
  const banner=ensureGuardBanner();
  if(banner){
    banner.hidden=false;
    const title=banner.querySelector?.("strong");
    const body=banner.querySelector?.("span");
    const button=banner.querySelector?.("button");
    if(status==="checking"){
      if(title)title.textContent="Refreshing live restaurant state";
      if(body)body.textContent="Blue Current is verifying this iPad before accepting new actions.";
      if(button){button.hidden=true;button.disabled=true;}
    }else if(status==="auth-required"){
      if(title)title.textContent="Session verification required";
      if(body)body.textContent="Sign in again to verify the operator session before live actions resume.";
      if(button){button.hidden=true;button.disabled=true;}
    }else{
      if(title)title.textContent="Live restaurant state is not ready";
      if(body)body.textContent="Blue Current has kept the operating surface protected. Retry verification before continuing.";
      if(button){button.hidden=false;button.disabled=false;}
    }
  }
  window.dispatchEvent?.(new CustomEvent("bluecurrent:resume-interaction-guard",{detail:snapshot({guarded:true})}));
  return snapshot();
}

function releaseInteractionGuard(reason="fresh-state"){
  guardStatus="idle";
  guardReason=reason;
  const main=mainSurface();
  if(main){
    main.removeAttribute?.("inert");
    main.removeAttribute?.("aria-busy");
    if(main.dataset)delete main.dataset.bcResumeGuard;
  }
  document.documentElement?.removeAttribute?.("data-bc-resume-guard");
  const banner=document.getElementById?.("bcResumeStateGuard");
  if(banner)banner.hidden=true;
  window.dispatchEvent?.(new CustomEvent("bluecurrent:resume-interaction-guard",{detail:snapshot({guarded:false})}));
  return snapshot();
}

async function refreshSharedState(reason="resume"){
  const foundation=cloudFoundation();
  if(!foundation?.refreshBootstrap){
    return {refreshed:false,status:"unavailable",reason:"bootstrap-refresh-unavailable"};
  }
  try{
    await foundation.refreshBootstrap();
    return {refreshed:true,status:"fresh",reason};
  }catch(error){
    return {
      refreshed:false,
      status:"failed",
      reason:"bootstrap-refresh-failed",
      error:String(error?.message||error)
    };
  }
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

async function resume(reason="foreground",options={}){
  const now=Date.now();
  if(inFlight)return inFlight;
  if(!options.force&&now-lastResumeAt<750)return snapshot({reason,coalesced:true});
  lastResumeAt=now;
  const authAtStart=window.BlueCurrentAuthSession?.snapshot?.();
  if(authAtStart?.authenticated)setInteractionGuard("checking",reason);
  inFlight=(async()=>{
    let connectivity=window.BlueCurrentConnectivityTruth?.snapshot?.()||null;
    if(window.BlueCurrentConnectivityTruth?.verify){
      connectivity=await window.BlueCurrentConnectivityTruth.verify(`resume:${reason}`);
    }

    let session={verified:false,status:"not-checked",reason:"server-unverified"};
    let replayed=false;
    let sharedState={refreshed:false,status:"not-checked",reason:"resume-not-verified"};

    if(connectivity?.state==="connected"){
      session=await verifySession(reason);
      if(session.verified&&window.BlueCurrentAuthSession?.snapshot?.().authenticated&&window.BlueCurrentOfflineSync?.replay){
        await window.BlueCurrentOfflineSync.replay();
        replayed=true;
        sharedState=await refreshSharedState(reason);
      }
    }

    if(sharedState.refreshed){
      releaseInteractionGuard("fresh-state");
    }else if(session.status==="expired"||session.status==="anonymous"){
      setInteractionGuard("auth-required",session.reason);
    }else if(authAtStart?.authenticated){
      setInteractionGuard("blocked",sharedState.reason||session.reason||connectivity?.state||"resume-incomplete");
    }

    const detail=snapshot({
      reason,
      replayed,
      sessionVerified:Boolean(session.verified),
      sessionResumeStatus:session.status,
      sessionResumeReason:session.reason,
      sharedStateRefreshed:Boolean(sharedState.refreshed),
      sharedStateResumeStatus:sharedState.status,
      sharedStateResumeReason:sharedState.reason
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
window.addEventListener("bluecurrent:auth-session-state",event=>{
  if(guardStatus==="auth-required"&&event.detail?.snapshot?.authenticated&&document.visibilityState==="visible"){
    resume("session-restored",{force:true});
  }
});
window.BlueCurrentResumeTruth={version:VERSION,snapshot,resume,verifySession,refreshSharedState,setInteractionGuard,releaseInteractionGuard};
})();