(function(global){"use strict";
class BlueCurrentExpansionCohortObservationEngine{
  constructor({eventBus,appState}={}){this.eventBus=eventBus;this.appState=appState;}
  token(){return localStorage.getItem("blueCurrentV3230Token")||"";}
  headers(){return{Authorization:`Bearer ${this.token()}`};}
  async snapshot(){const r=await fetch("/api/expansion-cohort-observation",{headers:this.headers()}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Expansion cohort observation failed (${r.status})`);this.appState?.update?.({expansionCohortObservation:d});return d;}
  async activate(id,payload){const r=await fetch(`/api/expansion-cohort-observation/cohorts/${encodeURIComponent(id)}/activate`,{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Cohort activation failed (${r.status})`);this.eventBus?.emit?.("expansion-cohort:activated",d);return d;}
  async observe(id,payload){const r=await fetch(`/api/expansion-cohort-observation/activations/${encodeURIComponent(id)}/observe`,{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Cohort observation failed (${r.status})`);this.eventBus?.emit?.("expansion-cohort:observed",d);return d;}
  async decide(id,payload){const r=await fetch(`/api/expansion-cohort-observation/activations/${encodeURIComponent(id)}/decision`,{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Cohort decision failed (${r.status})`);this.eventBus?.emit?.("expansion-cohort:decision",d);return d;}
}
if(global)global.BlueCurrentExpansionCohortObservationEngine=BlueCurrentExpansionCohortObservationEngine;
})(window);