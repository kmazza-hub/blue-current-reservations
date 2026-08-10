(function(global){"use strict";
class BlueCurrentPilotLiveServiceAcceptanceEngine{
 constructor({eventBus,appState}={}){this.eventBus=eventBus;this.appState=appState;}
 token(){return localStorage.getItem("blueCurrentV3230Token")||"";}
 headers(){return{Authorization:`Bearer ${this.token()}`};}
 async snapshot(){const r=await fetch("/api/pilot-live-service-acceptance",{headers:this.headers()}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Pilot live-service acceptance failed (${r.status})`);this.appState?.update?.({pilotLiveServiceAcceptance:d});return d;}
 async review(id,payload){const r=await fetch(`/api/pilot-live-service-acceptance/locations/${encodeURIComponent(id)}/review`,{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Live-service review failed (${r.status})`);return d;}
 async decide(id,payload){const r=await fetch(`/api/pilot-live-service-acceptance/locations/${encodeURIComponent(id)}/decision`,{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Live-service decision failed (${r.status})`);return d;}
}
if(global)global.BlueCurrentPilotLiveServiceAcceptanceEngine=BlueCurrentPilotLiveServiceAcceptanceEngine;})(window);