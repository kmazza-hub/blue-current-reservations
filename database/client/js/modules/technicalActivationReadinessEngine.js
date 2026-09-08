(function(global){"use strict";
class BlueCurrentTechnicalActivationReadinessEngine{
  constructor({eventBus,appState}={}){this.eventBus=eventBus;this.appState=appState;}
  token(){return localStorage.getItem("blueCurrentV3230Token")||"";}
  headers(){return {Authorization:`Bearer ${this.token()}`};}
  async snapshot(){const r=await fetch("/api/technical-activation-readiness",{headers:this.headers()}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Technical activation readiness failed (${r.status})`);this.appState?.update?.({technicalActivationReadiness:d});return d;}
  async packet(locationId){const r=await fetch(`/api/technical-activation-readiness/locations/${encodeURIComponent(locationId)}/packet`,{headers:this.headers()}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Technical activation packet failed (${r.status})`);return d;}
  async authorize(locationId,payload={}){const r=await fetch(`/api/technical-activation-readiness/locations/${encodeURIComponent(locationId)}/authorize-go-live`,{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Go-live authorization failed (${r.status})`);this.eventBus?.emit?.("technical-activation:authorized",structuredClone(d));return d;}
}
if(typeof module!=="undefined"&&module.exports)module.exports=BlueCurrentTechnicalActivationReadinessEngine;
if(global)global.BlueCurrentTechnicalActivationReadinessEngine=BlueCurrentTechnicalActivationReadinessEngine;
})(typeof window!=="undefined"?window:globalThis);