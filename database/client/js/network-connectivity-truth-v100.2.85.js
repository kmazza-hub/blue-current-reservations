(function(){
"use strict";
const HEALTH_PATH="/api/health";
let state="unknown",lastCheckedAt=null,lastConnectedAt=null,lastError=null,requestId=0;

function snapshot(){
  return Object.freeze({
    version:"100.2.85",
    state,
    browserOnline:navigator.onLine,
    serverVerified:state==="connected",
    lastCheckedAt,
    lastConnectedAt,
    lastError
  });
}
function publish(next,extra={}){
  state=next;
  lastError=extra.error||null;
  if(next==="connected")lastConnectedAt=new Date().toISOString();
  document.documentElement.dataset.bcConnectivityState=next;
  const detail={...snapshot(),reason:extra.reason||"state-change"};
  window.dispatchEvent(new CustomEvent("bluecurrent:connectivity-state",{detail}));
  return detail;
}
async function verify(reason="manual"){
  const id=++requestId;
  if(!navigator.onLine)return publish("offline",{reason});
  publish("checking",{reason});
  lastCheckedAt=new Date().toISOString();
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),4500);
  try{
    const response=await fetch(HEALTH_PATH,{method:"GET",cache:"no-store",credentials:"same-origin",signal:controller.signal,headers:{"X-Blue-Current-Connectivity-Probe":"1"}});
    clearTimeout(timer);
    if(id!==requestId)return snapshot();
    if(!response.ok)return publish("unreachable",{reason,error:`Health check returned ${response.status}`});
    return publish("connected",{reason});
  }catch(error){
    clearTimeout(timer);
    if(id!==requestId)return snapshot();
    if(!navigator.onLine)return publish("offline",{reason});
    return publish("unreachable",{reason,error:error?.name==="AbortError"?"Health check timed out":String(error?.message||error)});
  }
}
function ready(fn){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",fn,{once:true}):fn();}
window.addEventListener("offline",()=>{requestId++;publish("offline",{reason:"browser-offline"});});
window.addEventListener("online",()=>verify("browser-online"));
window.addEventListener("bluecurrent:connectivity-retry",()=>verify("operator-retry"));
ready(()=>verify("startup"));
window.BlueCurrentConnectivityTruth={version:"100.2.85",snapshot,verify};
})();