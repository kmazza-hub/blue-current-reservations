(function(global){"use strict";
class BlueCurrentPilotProofProgramEngine{
 constructor({eventBus,appState}={}){this.eventBus=eventBus;this.appState=appState;}
 token(){return localStorage.getItem("blueCurrentV3230Token")||"";}
 async snapshot(){const r=await fetch("/api/pilot-proof-program",{headers:{Authorization:`Bearer ${this.token()}`}}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Pilot proof program failed (${r.status})`);this.appState?.update?.({pilotProofProgram:d});return d;}
 async configure(payload={}){const r=await fetch("/api/pilot-proof-program/configure",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${this.token()}`},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Success criteria failed (${r.status})`);this.eventBus?.emit?.("pilot-proof:configured",structuredClone(d));return d;}
}
if(typeof module!=="undefined"&&module.exports)module.exports=BlueCurrentPilotProofProgramEngine;if(global)global.BlueCurrentPilotProofProgramEngine=BlueCurrentPilotProofProgramEngine;})(typeof window!=="undefined"?window:globalThis);