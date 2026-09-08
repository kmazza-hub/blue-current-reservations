(function(global){"use strict";
class BlueCurrentExpansionRepeatabilityCertificationEngine{
 constructor({eventBus,appState}={}){this.eventBus=eventBus;this.appState=appState;}
 token(){return localStorage.getItem("blueCurrentV3230Token")||"";} headers(){return{Authorization:`Bearer ${this.token()}`};}
 async snapshot(){const r=await fetch("/api/expansion-repeatability",{headers:this.headers()}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Repeatability review failed (${r.status})`);this.appState?.update?.({expansionRepeatability:d});return d;}
 async playbook(payload){const r=await fetch("/api/expansion-repeatability/playbook",{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Playbook generation failed (${r.status})`);this.eventBus?.emit?.("expansion-repeatability:playbook-generated",d);return d;}
 async certify(payload){const r=await fetch("/api/expansion-repeatability/certify",{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Repeatability certification failed (${r.status})`);this.eventBus?.emit?.("expansion-repeatability:certified",d);return d;}
}
if(global)global.BlueCurrentExpansionRepeatabilityCertificationEngine=BlueCurrentExpansionRepeatabilityCertificationEngine;})(window);