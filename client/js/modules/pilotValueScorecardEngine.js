(function(global){"use strict";
class BlueCurrentPilotValueScorecardEngine{
  constructor({eventBus,appState}={}){this.eventBus=eventBus;this.appState=appState;}
  token(){return localStorage.getItem("blueCurrentV3230Token")||"";}
  headers(){return {"Content-Type":"application/json",Authorization:`Bearer ${this.token()}`};}
  async snapshot(){const r=await fetch("/api/pilot-value-scorecard",{headers:{Authorization:`Bearer ${this.token()}`}}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Pilot value scorecard failed (${r.status})`);this.appState?.update?.({pilotValueScorecard:d});this.eventBus?.emit?.("pilot-value:updated",structuredClone(d));return d;}
  async baseline(payload={}){const r=await fetch("/api/pilot-value-scorecard/baseline",{method:"POST",headers:this.headers(),body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Pilot baseline failed (${r.status})`);this.eventBus?.emit?.("pilot-value:started",structuredClone(d));return d;}
  async checkpoint(note=""){const r=await fetch("/api/pilot-value-scorecard/checkpoints",{method:"POST",headers:this.headers(),body:JSON.stringify({note})}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Pilot checkpoint failed (${r.status})`);this.eventBus?.emit?.("pilot-value:checkpoint",structuredClone(d));return d;}
}
if(typeof module!=="undefined"&&module.exports)module.exports=BlueCurrentPilotValueScorecardEngine;
if(global)global.BlueCurrentPilotValueScorecardEngine=BlueCurrentPilotValueScorecardEngine;
})(typeof window!=="undefined"?window:globalThis);