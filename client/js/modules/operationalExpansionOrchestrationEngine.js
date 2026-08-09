(function(global){"use strict";
class BlueCurrentOperationalExpansionOrchestrationEngine{
 constructor({eventBus,appState}={}){this.eventBus=eventBus;this.appState=appState;}
 token(){return localStorage.getItem("blueCurrentV3230Token")||"";} headers(){return{Authorization:`Bearer ${this.token()}`};}
 async snapshot(){const r=await fetch("/api/operational-expansion-orchestration",{headers:this.headers()}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Operational orchestration failed (${r.status})`);this.appState?.update?.({operationalExpansionOrchestration:d});return d;}
 async createPlan(payload){const r=await fetch("/api/operational-expansion-orchestration/plans",{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Orchestration plan creation failed (${r.status})`);this.eventBus?.emit?.("operational-orchestration:plan-created",d);return d;}
 async decide(planId,payload){const r=await fetch(`/api/operational-expansion-orchestration/plans/${encodeURIComponent(planId)}/decision`,{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Orchestration decision failed (${r.status})`);this.eventBus?.emit?.("operational-orchestration:decision",d);return d;}
}
if(global)global.BlueCurrentOperationalExpansionOrchestrationEngine=BlueCurrentOperationalExpansionOrchestrationEngine;})(window);