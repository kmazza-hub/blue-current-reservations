(function(global){"use strict";
class BlueCurrentRolloutActivationControlEngine{
  constructor({eventBus,appState}={}){this.eventBus=eventBus;this.appState=appState;}
  token(){return localStorage.getItem("blueCurrentV3230Token")||"";}
  headers(){return {Authorization:`Bearer ${this.token()}`};}
  async snapshot(){const r=await fetch("/api/rollout-activation-control",{headers:this.headers()}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Rollout activation control failed (${r.status})`);this.appState?.update?.({rolloutActivationControl:d});return d;}
  async approve(locationId,payload={}){const r=await fetch(`/api/rollout-activation-control/locations/${encodeURIComponent(locationId)}/approve`,{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Activation approval failed (${r.status})`);this.eventBus?.emit?.("rollout-activation:approved",structuredClone(d));return d;}
}
if(typeof module!=="undefined"&&module.exports)module.exports=BlueCurrentRolloutActivationControlEngine;
if(global)global.BlueCurrentRolloutActivationControlEngine=BlueCurrentRolloutActivationControlEngine;
})(typeof window!=="undefined"?window:globalThis);