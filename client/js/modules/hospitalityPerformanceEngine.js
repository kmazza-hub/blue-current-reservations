(function(global){"use strict";
class BlueCurrentHospitalityPerformanceEngine{
  constructor({eventBus,appState}={}){this.eventBus=eventBus;this.appState=appState;}
  token(){return localStorage.getItem("blueCurrentV3230Token")||"";}
  locationId(){const s=this.appState?.getState?.()||{};return s.activeLocationId||s.selectedLocationId||s.auth?.locationId||"loc_marina";}
  async snapshot(){const r=await fetch(`/api/hospitality-performance?locationId=${encodeURIComponent(this.locationId())}`,{headers:{Authorization:`Bearer ${this.token()}`}}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Hospitality Performance failed (${r.status})`);this.appState?.update?.({hospitalityPerformance:d});this.eventBus?.emit?.("hospitality-performance:updated",structuredClone(d));return d;}
  async decide(opportunityId,decision,owner="",note=""){const r=await fetch(`/api/hospitality-performance/opportunities/${encodeURIComponent(opportunityId)}/decision`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${this.token()}`},body:JSON.stringify({locationId:this.locationId(),decision,owner,note})}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Performance decision failed (${r.status})`);this.eventBus?.emit?.("hospitality-performance:decision",structuredClone(d));return d;}
}
if(typeof module!=="undefined"&&module.exports)module.exports=BlueCurrentHospitalityPerformanceEngine;
if(global)global.BlueCurrentHospitalityPerformanceEngine=BlueCurrentHospitalityPerformanceEngine;
})(typeof window!=="undefined"?window:globalThis);