(function(global){"use strict";
class BlueCurrentManagementExecutiveAccuracyEngine{
  constructor({eventBus,appState}={}){this.eventBus=eventBus;this.appState=appState;}
  token(){return localStorage.getItem("blueCurrentV3230Token")||"";}
  headers(){return {Authorization:`Bearer ${this.token()}`};}
  async snapshot(){const r=await fetch("/api/management-executive-accuracy",{headers:this.headers()}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Management/executive accuracy failed (${r.status})`);this.appState?.update?.({managementExecutiveAccuracy:d});return d;}
  async certify(payload={}){const r=await fetch("/api/management-executive-accuracy/certify",{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Management/executive accuracy certification failed (${r.status})`);this.eventBus?.emit?.("management-executive-accuracy:certified",structuredClone(d));return d;}
}
if(typeof module!=="undefined"&&module.exports)module.exports=BlueCurrentManagementExecutiveAccuracyEngine;
if(global)global.BlueCurrentManagementExecutiveAccuracyEngine=BlueCurrentManagementExecutiveAccuracyEngine;
})(typeof window!=="undefined"?window:globalThis);