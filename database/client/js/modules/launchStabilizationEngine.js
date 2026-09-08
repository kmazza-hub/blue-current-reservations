(function(global){"use strict";
class BlueCurrentLaunchStabilizationEngine{
  constructor({eventBus,appState}={}){this.eventBus=eventBus;this.appState=appState;}
  token(){return localStorage.getItem("blueCurrentV3230Token")||"";}
  headers(){return {Authorization:`Bearer ${this.token()}`};}
  async snapshot(){const r=await fetch("/api/launch-stabilization",{headers:this.headers()}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Launch stabilization failed (${r.status})`);this.appState?.update?.({launchStabilization:d});return d;}
  async observe(locationId,payload={}){const r=await fetch(`/api/launch-stabilization/locations/${encodeURIComponent(locationId)}/observe`,{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Stabilization observation failed (${r.status})`);this.eventBus?.emit?.("launch-stabilization:observed",structuredClone(d));return d;}
  async declare(locationId,payload={}){const r=await fetch(`/api/launch-stabilization/locations/${encodeURIComponent(locationId)}/declare`,{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Stabilization declaration failed (${r.status})`);this.eventBus?.emit?.("launch-stabilization:declared",structuredClone(d));return d;}
}
if(typeof module!=="undefined"&&module.exports)module.exports=BlueCurrentLaunchStabilizationEngine;
if(global)global.BlueCurrentLaunchStabilizationEngine=BlueCurrentLaunchStabilizationEngine;
})(typeof window!=="undefined"?window:globalThis);