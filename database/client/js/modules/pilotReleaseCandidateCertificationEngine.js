(function(global){"use strict";
class BlueCurrentPilotReleaseCandidateCertificationEngine{
 constructor({eventBus,appState}={}){this.eventBus=eventBus;this.appState=appState;}
 token(){return localStorage.getItem("blueCurrentV3230Token")||"";}
 headers(){return{Authorization:`Bearer ${this.token()}`};}
 async snapshot(){const r=await fetch("/api/pilot-release-candidate-certification",{headers:this.headers()}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Pilot RC certification failed (${r.status})`);this.appState?.update?.({pilotReleaseCandidateCertification:d});return d;}
 async review(payload){const r=await fetch("/api/pilot-release-candidate-certification/review",{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Pilot RC review failed (${r.status})`);return d;}
 async certify(payload){const r=await fetch("/api/pilot-release-candidate-certification/certify",{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Pilot RC certification failed (${r.status})`);return d;}
}
if(global)global.BlueCurrentPilotReleaseCandidateCertificationEngine=BlueCurrentPilotReleaseCandidateCertificationEngine;})(window);