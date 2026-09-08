(function(global){"use strict";
class BlueCurrentRolePermissionCertificationEngine{
  constructor({eventBus,appState}={}){this.eventBus=eventBus;this.appState=appState;}
  token(){return localStorage.getItem("blueCurrentV3230Token")||"";}
  headers(){return {Authorization:`Bearer ${this.token()}`};}
  async snapshot(){const r=await fetch("/api/role-permission-certification",{headers:this.headers()}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Role permission certification failed (${r.status})`);this.appState?.update?.({rolePermissionCertification:d});return d;}
  async certify(payload={}){const r=await fetch("/api/role-permission-certification/certify",{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Role permission certification failed (${r.status})`);this.eventBus?.emit?.("role-permission:certified",structuredClone(d));return d;}
}
if(typeof module!=="undefined"&&module.exports)module.exports=BlueCurrentRolePermissionCertificationEngine;
if(global)global.BlueCurrentRolePermissionCertificationEngine=BlueCurrentRolePermissionCertificationEngine;
})(typeof window!=="undefined"?window:globalThis);