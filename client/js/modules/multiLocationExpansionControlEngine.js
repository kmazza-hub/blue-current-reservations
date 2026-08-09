(function(global){"use strict";
class BlueCurrentMultiLocationExpansionControlEngine{
  constructor({eventBus,appState}={}){this.eventBus=eventBus;this.appState=appState;}
  token(){return localStorage.getItem("blueCurrentV3230Token")||"";}
  headers(){return{Authorization:`Bearer ${this.token()}`};}
  async snapshot(){const r=await fetch("/api/multi-location-expansion",{headers:this.headers()}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Multi-location expansion failed (${r.status})`);this.appState?.update?.({multiLocationExpansion:d});return d;}
  async createPlan(payload){const r=await fetch("/api/multi-location-expansion/plans",{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Expansion plan creation failed (${r.status})`);this.eventBus?.emit?.("multi-location-expansion:plan-created",d);return d;}
  async approve(planId,payload){const r=await fetch(`/api/multi-location-expansion/plans/${encodeURIComponent(planId)}/approve`,{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Expansion approval failed (${r.status})`);this.eventBus?.emit?.("multi-location-expansion:approved",d);return d;}
}
if(global)global.BlueCurrentMultiLocationExpansionControlEngine=BlueCurrentMultiLocationExpansionControlEngine;
})(window);