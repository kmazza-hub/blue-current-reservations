(function(global){"use strict";
class BlueCurrentServiceProfitabilityEngine{
  constructor({eventBus,appState}={}){this.eventBus=eventBus;this.appState=appState;}
  token(){return localStorage.getItem("blueCurrentV3230Token")||"";}
  locationId(){const s=this.appState?.getState?.()||{};return s.activeLocationId||s.selectedLocationId||s.auth?.locationId||"loc_marina";}
  async snapshot(){const r=await fetch(`/api/service-profitability?locationId=${encodeURIComponent(this.locationId())}`,{headers:{Authorization:`Bearer ${this.token()}`}}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Service profitability failed (${r.status})`);this.appState?.update?.({serviceProfitability:d});this.eventBus?.emit?.("service-profitability:updated",structuredClone(d));return d;}
  async capture(){const r=await fetch("/api/service-profitability/snapshots",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${this.token()}`},body:JSON.stringify({locationId:this.locationId()})}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Profitability snapshot failed (${r.status})`);this.eventBus?.emit?.("service-profitability:snapshot",structuredClone(d));return d;}
}
if(typeof module!=="undefined"&&module.exports)module.exports=BlueCurrentServiceProfitabilityEngine;
if(global)global.BlueCurrentServiceProfitabilityEngine=BlueCurrentServiceProfitabilityEngine;
})(typeof window!=="undefined"?window:globalThis);