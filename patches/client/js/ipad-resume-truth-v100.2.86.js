(function(){
"use strict";
const VERSION="100.2.86";
let wasHidden=document.hidden;
let lastResumeAt=0;
let inFlight=null;

function snapshot(extra={}){
  const sync=window.BlueCurrentOfflineSync?.snapshot?.();
  return Object.freeze({
    version:VERSION,
    hidden:document.hidden,
    lastResumeAt:lastResumeAt?new Date(lastResumeAt).toISOString():null,
    connectivity:window.BlueCurrentConnectivityTruth?.snapshot?.()||null,
    queuedWrites:Number(sync?.queueDepth||0),
    openConflicts:Number(sync?.openConflicts||0),
    ...extra
  });
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
    let replayed=false;
    if(connectivity?.state==="connected"&&window.BlueCurrentOfflineSync?.replay){
      await window.BlueCurrentOfflineSync.replay();
      replayed=true;
    }
    const detail=snapshot({reason,replayed});
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
window.BlueCurrentResumeTruth={version:VERSION,snapshot,resume};
})();