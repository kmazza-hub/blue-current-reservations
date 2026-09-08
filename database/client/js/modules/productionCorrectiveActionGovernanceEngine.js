(function(global){"use strict";
class BlueCurrentProductionCorrectiveActionGovernanceEngine{
  constructor({eventBus,appState}={}){this.eventBus=eventBus;this.appState=appState;}
  token(){return localStorage.getItem("blueCurrentV3230Token")||"";}
  headers(){return {Authorization:`Bearer ${this.token()}`};}
  async snapshot(){const r=await fetch("/api/production-corrective-action-governance",{headers:this.headers()}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Corrective action governance failed (${r.status})`);this.appState?.update?.({productionCorrectiveActionGovernance:d});return d;}
  async verify(reviewId,actionId,payload={}){const r=await fetch(`/api/production-corrective-action-governance/reviews/${encodeURIComponent(reviewId)}/actions/${encodeURIComponent(actionId)}/verify`,{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Corrective action verification failed (${r.status})`);this.eventBus?.emit?.("production-learning:action-verified",structuredClone(d));return d;}
  async acceptCompletion(reviewId,actionId,payload={}){const r=await fetch(`/api/production-corrective-action-governance/reviews/${encodeURIComponent(reviewId)}/actions/${encodeURIComponent(actionId)}/accept-completion`,{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Corrective action completion acceptance failed (${r.status})`);this.eventBus?.emit?.("production-learning:action-completed",structuredClone(d));return d;}
}
if(typeof module!=="undefined"&&module.exports)module.exports=BlueCurrentProductionCorrectiveActionGovernanceEngine;
if(global)global.BlueCurrentProductionCorrectiveActionGovernanceEngine=BlueCurrentProductionCorrectiveActionGovernanceEngine;
})(typeof window!=="undefined"?window:globalThis);