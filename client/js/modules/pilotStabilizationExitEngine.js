(function(global){"use strict";
class BlueCurrentPilotStabilizationExitEngine{
  constructor({eventBus,appState}={}){this.eventBus=eventBus;this.appState=appState;}
  token(){return localStorage.getItem("blueCurrentV3230Token")||"";}
  headers(){return {Authorization:`Bearer ${this.token()}`};}
  async snapshot(){const r=await fetch("/api/pilot-stabilization-exit",{headers:this.headers()}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Pilot stabilization failed (${r.status})`);this.appState?.update?.({pilotStabilizationExit:d});return d;}
  async assess(locationId,payload={}){const r=await fetch(`/api/pilot-stabilization-exit/locations/${encodeURIComponent(locationId)}/assess`,{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Pilot stabilization assessment failed (${r.status})`);this.eventBus?.emit?.("pilot-stabilization:assessed",structuredClone(d));return d;}
  async decide(locationId,payload={}){const r=await fetch(`/api/pilot-stabilization-exit/locations/${encodeURIComponent(locationId)}/decision`,{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Pilot exit decision failed (${r.status})`);this.eventBus?.emit?.("pilot-stabilization:decision",structuredClone(d));return d;}
}
if(typeof module!=="undefined"&&module.exports)module.exports=BlueCurrentPilotStabilizationExitEngine;
if(global)global.BlueCurrentPilotStabilizationExitEngine=BlueCurrentPilotStabilizationExitEngine;
})(typeof window!=="undefined"?window:globalThis);