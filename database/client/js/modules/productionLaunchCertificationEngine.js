(function(global){"use strict";
class BlueCurrentProductionLaunchCertificationEngine{
 constructor({eventBus,appState}={}){this.eventBus=eventBus;this.appState=appState;}
 token(){return localStorage.getItem("blueCurrentV3230Token")||"";}
 headers(){return{Authorization:`Bearer ${this.token()}`};}
 async snapshot(){const r=await fetch("/api/production-launch-certification",{headers:this.headers()}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Production launch certification failed (${r.status})`);this.appState?.update?.({productionLaunchCertification:d});return d;}
 async review(payload){const r=await fetch("/api/production-launch-certification/review",{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Production launch review failed (${r.status})`);return d;}
 async certify(payload){const r=await fetch("/api/production-launch-certification/certify",{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Finished product certification failed (${r.status})`);return d;}
}
if(global)global.BlueCurrentProductionLaunchCertificationEngine=BlueCurrentProductionLaunchCertificationEngine;})(window);