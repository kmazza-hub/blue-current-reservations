(function(global){"use strict";
class BlueCurrentPeakServiceStressEngine{
  constructor({eventBus,appState}={}){this.eventBus=eventBus;this.appState=appState;}
  token(){return localStorage.getItem("blueCurrentV3230Token")||"";}
  headers(){return {Authorization:`Bearer ${this.token()}`};}
  async snapshot(){const r=await fetch("/api/peak-service-stress",{headers:this.headers()}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Peak-service stress failed (${r.status})`);this.appState?.update?.({peakServiceStress:d});return d;}
  async start(locationId,payload={}){const r=await fetch(`/api/peak-service-stress/locations/${encodeURIComponent(locationId)}/start`,{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Peak-service stress start failed (${r.status})`);this.eventBus?.emit?.("peak-service-stress:started",structuredClone(d));return d;}
  async result(runId,payload={}){const r=await fetch(`/api/peak-service-stress/runs/${encodeURIComponent(runId)}/result`,{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Stress result failed (${r.status})`);this.eventBus?.emit?.("peak-service-stress:result",structuredClone(d));return d;}
}
if(typeof module!=="undefined"&&module.exports)module.exports=BlueCurrentPeakServiceStressEngine;
if(global)global.BlueCurrentPeakServiceStressEngine=BlueCurrentPeakServiceStressEngine;
})(typeof window!=="undefined"?window:globalThis);