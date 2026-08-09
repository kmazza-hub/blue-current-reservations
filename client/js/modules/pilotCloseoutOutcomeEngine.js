(function(global){"use strict";
class BlueCurrentPilotCloseoutOutcomeEngine{
  constructor({eventBus,appState}={}){this.eventBus=eventBus;this.appState=appState;}
  token(){return localStorage.getItem("blueCurrentV3230Token")||"";}
  headers(){return{Authorization:`Bearer ${this.token()}`};}
  async snapshot(){const r=await fetch("/api/pilot-closeout-outcome",{headers:this.headers()}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Pilot closeout failed (${r.status})`);this.appState?.update?.({pilotCloseoutOutcome:d});return d;}
  async review(locationId,payload={}){const r=await fetch(`/api/pilot-closeout-outcome/locations/${encodeURIComponent(locationId)}/review`,{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Pilot closeout review failed (${r.status})`);this.eventBus?.emit?.("pilot-closeout:reviewed",structuredClone(d));return d;}
  async decide(locationId,payload={}){const r=await fetch(`/api/pilot-closeout-outcome/locations/${encodeURIComponent(locationId)}/decision`,{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Pilot expansion decision failed (${r.status})`);this.eventBus?.emit?.("pilot-closeout:decision",structuredClone(d));return d;}
}
if(typeof module!=="undefined"&&module.exports)module.exports=BlueCurrentPilotCloseoutOutcomeEngine;
if(global)global.BlueCurrentPilotCloseoutOutcomeEngine=BlueCurrentPilotCloseoutOutcomeEngine;
})(typeof window!=="undefined"?window:globalThis);