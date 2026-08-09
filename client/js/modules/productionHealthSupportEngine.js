(function(global){"use strict";
class BlueCurrentProductionHealthSupportEngine{
  constructor({eventBus,appState}={}){this.eventBus=eventBus;this.appState=appState;}
  token(){return localStorage.getItem("blueCurrentV3230Token")||"";}
  headers(){return {Authorization:`Bearer ${this.token()}`};}
  async snapshot(){const r=await fetch("/api/production-health-support",{headers:this.headers()}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Production health support failed (${r.status})`);this.appState?.update?.({productionHealthSupport:d});return d;}
  async create(locationId,payload={}){const r=await fetch(`/api/production-health-support/locations/${encodeURIComponent(locationId)}/events`,{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Support event creation failed (${r.status})`);this.eventBus?.emit?.("production-support:event-created",structuredClone(d));return d;}
  async update(eventId,payload={}){const r=await fetch(`/api/production-health-support/events/${encodeURIComponent(eventId)}`,{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Support event update failed (${r.status})`);this.eventBus?.emit?.("production-support:event-updated",structuredClone(d));return d;}
}
if(typeof module!=="undefined"&&module.exports)module.exports=BlueCurrentProductionHealthSupportEngine;
if(global)global.BlueCurrentProductionHealthSupportEngine=BlueCurrentProductionHealthSupportEngine;
})(typeof window!=="undefined"?window:globalThis);