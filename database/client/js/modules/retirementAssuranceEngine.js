(function(global){"use strict";
class BlueCurrentRetirementAssuranceEngine{
  constructor({eventBus,appState}={}){this.eventBus=eventBus;this.appState=appState;}
  token(){return localStorage.getItem("blueCurrentV3230Token")||"";}
  async snapshot(){const r=await fetch("/api/operator-fine-comb/retirement-assurance",{headers:{Authorization:`Bearer ${this.token()}`}}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Retirement assurance failed (${r.status})`);this.appState?.update?.({retirementAssurance:d});this.eventBus?.emit?.("retirement-assurance:updated",structuredClone(d));return d;}
  nextCandidateReadiness(snapshot){const s=snapshot||this.appState?.getState?.().retirementAssurance||null;if(!s)return {eligible:false,reason:"Retirement assurance has not been evaluated."};return {eligible:s.nextCandidateGate?.eligible===true&&s.regressions===0&&s.trusted===true,reason:s.nextCandidateGate?.reason||"Unknown",assured:s.assured||0,retirements:s.retirements||0,digest:s.digest||null};}
}
if(typeof module!=="undefined"&&module.exports)module.exports=BlueCurrentRetirementAssuranceEngine;
if(global)global.BlueCurrentRetirementAssuranceEngine=BlueCurrentRetirementAssuranceEngine;
})(typeof window!=="undefined"?window:globalThis);