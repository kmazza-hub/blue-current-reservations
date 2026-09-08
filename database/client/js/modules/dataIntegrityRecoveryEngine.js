(function(global){"use strict";
class BlueCurrentDataIntegrityRecoveryEngine{
  constructor({eventBus,appState}={}){this.eventBus=eventBus;this.appState=appState;}
  token(){return localStorage.getItem("blueCurrentV3230Token")||"";}
  headers(){return {Authorization:`Bearer ${this.token()}`};}
  async snapshot(){const r=await fetch("/api/data-integrity-recovery",{headers:this.headers()}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Data integrity recovery failed (${r.status})`);this.appState?.update?.({dataIntegrityRecovery:d});return d;}
  async verify(locationId,payload={}){const r=await fetch(`/api/data-integrity-recovery/locations/${encodeURIComponent(locationId)}/verify`,{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Integrity verification failed (${r.status})`);this.eventBus?.emit?.("data-integrity:verified",structuredClone(d));return d;}
  async certify(locationId,payload={}){const r=await fetch(`/api/data-integrity-recovery/locations/${encodeURIComponent(locationId)}/certify`,{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Integrity certification failed (${r.status})`);this.eventBus?.emit?.("data-integrity:certified",structuredClone(d));return d;}
}
if(typeof module!=="undefined"&&module.exports)module.exports=BlueCurrentDataIntegrityRecoveryEngine;
if(global)global.BlueCurrentDataIntegrityRecoveryEngine=BlueCurrentDataIntegrityRecoveryEngine;
})(typeof window!=="undefined"?window:globalThis);