(function(global){"use strict";
class BlueCurrentPilotDeploymentPackageEngine{
  constructor({eventBus,appState}={}){this.eventBus=eventBus;this.appState=appState;}
  token(){return localStorage.getItem("blueCurrentV3230Token")||"";}
  headers(){return {Authorization:`Bearer ${this.token()}`};}
  async snapshot(){const r=await fetch("/api/pilot-deployment-package",{headers:this.headers()}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Pilot deployment package failed (${r.status})`);this.appState?.update?.({pilotDeploymentPackage:d});return d;}
  async generate(locationId,payload={}){const r=await fetch(`/api/pilot-deployment-package/locations/${encodeURIComponent(locationId)}/generate`,{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Pilot deployment package generation failed (${r.status})`);this.eventBus?.emit?.("pilot-deployment:package-generated",structuredClone(d));return d;}
  async certify(locationId,payload={}){const r=await fetch(`/api/pilot-deployment-package/locations/${encodeURIComponent(locationId)}/certify`,{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Pilot deployment certification failed (${r.status})`);this.eventBus?.emit?.("pilot-deployment:certified",structuredClone(d));return d;}
}
if(typeof module!=="undefined"&&module.exports)module.exports=BlueCurrentPilotDeploymentPackageEngine;
if(global)global.BlueCurrentPilotDeploymentPackageEngine=BlueCurrentPilotDeploymentPackageEngine;
})(typeof window!=="undefined"?window:globalThis);