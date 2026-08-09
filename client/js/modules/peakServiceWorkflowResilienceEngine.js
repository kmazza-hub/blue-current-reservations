(function(global){"use strict";
class BlueCurrentPeakServiceWorkflowResilienceEngine{
 constructor({eventBus,appState}={}){this.eventBus=eventBus;this.appState=appState;}
 token(){return localStorage.getItem("blueCurrentV3230Token")||"";} headers(){return{Authorization:`Bearer ${this.token()}`};}
 async snapshot(){const r=await fetch("/api/peak-service-workflow-resilience",{headers:this.headers()}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Peak-service resilience failed (${r.status})`);this.appState?.update?.({peakServiceWorkflowResilience:d});return d;}
 async observe(id,payload){const r=await fetch(`/api/peak-service-workflow-resilience/locations/${encodeURIComponent(id)}/observe`,{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Peak-service observation failed (${r.status})`);this.eventBus?.emit?.("peak-service-workflow:observed",d);return d;}
 async certify(id,payload){const r=await fetch(`/api/peak-service-workflow-resilience/locations/${encodeURIComponent(id)}/certify`,{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Peak-service certification failed (${r.status})`);this.eventBus?.emit?.("peak-service-workflow:certified",d);return d;}
}
if(global)global.BlueCurrentPeakServiceWorkflowResilienceEngine=BlueCurrentPeakServiceWorkflowResilienceEngine;})(window);