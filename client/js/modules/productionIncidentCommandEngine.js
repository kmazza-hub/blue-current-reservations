(function(global){"use strict";
class BlueCurrentProductionIncidentCommandEngine{
  constructor({eventBus,appState}={}){this.eventBus=eventBus;this.appState=appState;}
  token(){return localStorage.getItem("blueCurrentV3230Token")||"";}
  headers(){return {Authorization:`Bearer ${this.token()}`};}
  async snapshot(){const r=await fetch("/api/production-incident-command",{headers:this.headers()}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Production incident command failed (${r.status})`);this.appState?.update?.({productionIncidentCommand:d});return d;}
  async create(payload={}){const r=await fetch("/api/production-incident-command",{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Incident command creation failed (${r.status})`);this.eventBus?.emit?.("production-incident:created",structuredClone(d));return d;}
  async update(id,payload={}){const r=await fetch(`/api/production-incident-command/${encodeURIComponent(id)}`,{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Incident command update failed (${r.status})`);this.eventBus?.emit?.("production-incident:updated",structuredClone(d));return d;}
}
if(typeof module!=="undefined"&&module.exports)module.exports=BlueCurrentProductionIncidentCommandEngine;
if(global)global.BlueCurrentProductionIncidentCommandEngine=BlueCurrentProductionIncidentCommandEngine;
})(typeof window!=="undefined"?window:globalThis);