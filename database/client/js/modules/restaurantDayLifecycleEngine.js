(function(global){"use strict";
class BlueCurrentRestaurantDayLifecycleEngine{
  constructor({eventBus,appState}={}){this.eventBus=eventBus;this.appState=appState;}
  token(){return localStorage.getItem("blueCurrentV3230Token")||"";}
  headers(){return {Authorization:`Bearer ${this.token()}`};}
  async snapshot(){const r=await fetch("/api/restaurant-day-lifecycle",{headers:this.headers()}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Restaurant day lifecycle failed (${r.status})`);this.appState?.update?.({restaurantDayLifecycle:d});return d;}
  async start(locationId,payload={}){const r=await fetch(`/api/restaurant-day-lifecycle/locations/${encodeURIComponent(locationId)}/start`,{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Restaurant day start failed (${r.status})`);this.eventBus?.emit?.("restaurant-day:started",structuredClone(d));return d;}
  async checkpoint(sessionId,payload={}){const r=await fetch(`/api/restaurant-day-lifecycle/sessions/${encodeURIComponent(sessionId)}/checkpoint`,{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Restaurant day checkpoint failed (${r.status})`);this.eventBus?.emit?.("restaurant-day:checkpoint",structuredClone(d));return d;}
}
if(typeof module!=="undefined"&&module.exports)module.exports=BlueCurrentRestaurantDayLifecycleEngine;
if(global)global.BlueCurrentRestaurantDayLifecycleEngine=BlueCurrentRestaurantDayLifecycleEngine;
})(typeof window!=="undefined"?window:globalThis);