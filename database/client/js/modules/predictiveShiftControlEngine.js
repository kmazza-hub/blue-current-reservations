(function(global){"use strict";
class BlueCurrentPredictiveShiftControlEngine{
  constructor({eventBus,appState}={}){this.eventBus=eventBus;this.appState=appState;}
  token(){return localStorage.getItem("blueCurrentV3230Token")||"";}
  locationId(){const s=this.appState?.getState?.()||{};return s.activeLocationId||s.selectedLocationId||s.auth?.locationId||"loc_marina";}
  async snapshot(){const r=await fetch(`/api/predictive-shift-control?locationId=${encodeURIComponent(this.locationId())}`,{headers:{Authorization:`Bearer ${this.token()}`}}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Predictive shift control failed (${r.status})`);this.appState?.update?.({predictiveShiftControl:d});this.eventBus?.emit?.("predictive-shift:updated",structuredClone(d));return d;}
  async decide(interventionId,decision,owner="",note=""){const r=await fetch(`/api/predictive-shift-control/interventions/${encodeURIComponent(interventionId)}/decision`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${this.token()}`},body:JSON.stringify({locationId:this.locationId(),decision,owner,note})}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Predictive intervention failed (${r.status})`);this.eventBus?.emit?.("predictive-shift:decision",structuredClone(d));return d;}
}
if(typeof module!=="undefined"&&module.exports)module.exports=BlueCurrentPredictiveShiftControlEngine;
if(global)global.BlueCurrentPredictiveShiftControlEngine=BlueCurrentPredictiveShiftControlEngine;
})(typeof window!=="undefined"?window:globalThis);