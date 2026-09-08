(function(global){"use strict";
class BlueCurrentProductionOperationsHandoffEngine{
  constructor({eventBus,appState}={}){this.eventBus=eventBus;this.appState=appState;}
  token(){return localStorage.getItem("blueCurrentV3230Token")||"";}
  headers(){return {Authorization:`Bearer ${this.token()}`};}
  async snapshot(){const r=await fetch("/api/production-operations-handoff",{headers:this.headers()}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Production operations handoff failed (${r.status})`);this.appState?.update?.({productionOperationsHandoff:d});return d;}
  async accept(locationId,payload={}){const r=await fetch(`/api/production-operations-handoff/locations/${encodeURIComponent(locationId)}/accept`,{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Production operations acceptance failed (${r.status})`);this.eventBus?.emit?.("production-operations:accepted",structuredClone(d));return d;}
}
if(typeof module!=="undefined"&&module.exports)module.exports=BlueCurrentProductionOperationsHandoffEngine;
if(global)global.BlueCurrentProductionOperationsHandoffEngine=BlueCurrentProductionOperationsHandoffEngine;
})(typeof window!=="undefined"?window:globalThis);