(function(global){"use strict";
class BlueCurrentMultiLocationPerformanceEngine{
  constructor({eventBus,appState}={}){this.eventBus=eventBus;this.appState=appState;}
  token(){return localStorage.getItem("blueCurrentV3230Token")||"";}
  async snapshot(){const r=await fetch("/api/multi-location-performance",{headers:{Authorization:`Bearer ${this.token()}`}}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Multi-location performance failed (${r.status})`);this.appState?.update?.({multiLocationPerformance:d});this.eventBus?.emit?.("multi-location-performance:updated",structuredClone(d));return d;}
  async acknowledge(locationId,owner="",note=""){const r=await fetch(`/api/multi-location-performance/locations/${encodeURIComponent(locationId)}/acknowledge`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${this.token()}`},body:JSON.stringify({owner,note})}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Leadership acknowledgement failed (${r.status})`);this.eventBus?.emit?.("multi-location-performance:acknowledged",structuredClone(d));return d;}
}
if(typeof module!=="undefined"&&module.exports)module.exports=BlueCurrentMultiLocationPerformanceEngine;
if(global)global.BlueCurrentMultiLocationPerformanceEngine=BlueCurrentMultiLocationPerformanceEngine;
})(typeof window!=="undefined"?window:globalThis);