(function(global){"use strict";
class BlueCurrentLocationDeploymentPackageEngine{
  constructor({eventBus,appState}={}){this.eventBus=eventBus;this.appState=appState;}
  token(){return localStorage.getItem("blueCurrentV3230Token")||"";}
  headers(){return {Authorization:`Bearer ${this.token()}`};}
  async snapshot(){const r=await fetch("/api/location-deployment-package",{headers:this.headers()}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Location deployment package failed (${r.status})`);this.appState?.update?.({locationDeploymentPackage:d});return d;}
  async packet(locationId){const r=await fetch(`/api/location-deployment-package/locations/${encodeURIComponent(locationId)}/packet`,{headers:this.headers()}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Deployment packet failed (${r.status})`);return d;}
  async prepare(locationId,payload={}){const r=await fetch(`/api/location-deployment-package/locations/${encodeURIComponent(locationId)}/prepare`,{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Deployment package preparation failed (${r.status})`);this.eventBus?.emit?.("location-deployment:package-prepared",structuredClone(d));return d;}
}
if(typeof module!=="undefined"&&module.exports)module.exports=BlueCurrentLocationDeploymentPackageEngine;
if(global)global.BlueCurrentLocationDeploymentPackageEngine=BlueCurrentLocationDeploymentPackageEngine;
})(typeof window!=="undefined"?window:globalThis);