(function(global){"use strict";
class BlueCurrentExpansionPortfolioProofEngine{
  constructor({eventBus,appState}={}){this.eventBus=eventBus;this.appState=appState;}
  token(){return localStorage.getItem("blueCurrentV3230Token")||"";}
  headers(){return{Authorization:`Bearer ${this.token()}`};}
  async snapshot(){const r=await fetch("/api/expansion-portfolio-proof",{headers:this.headers()}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Expansion portfolio proof failed (${r.status})`);this.appState?.update?.({expansionPortfolioProof:d});return d;}
  async assess(payload){const r=await fetch("/api/expansion-portfolio-proof/assess",{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Portfolio-proof assessment failed (${r.status})`);this.eventBus?.emit?.("expansion-portfolio-proof:assessed",d);return d;}
  async decide(payload){const r=await fetch("/api/expansion-portfolio-proof/decision",{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Portfolio-proof decision failed (${r.status})`);this.eventBus?.emit?.("expansion-portfolio-proof:decision",d);return d;}
}
if(global)global.BlueCurrentExpansionPortfolioProofEngine=BlueCurrentExpansionPortfolioProofEngine;
})(window);