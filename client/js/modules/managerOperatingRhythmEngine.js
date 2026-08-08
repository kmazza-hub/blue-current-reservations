(function(global){"use strict";
class BlueCurrentManagerOperatingRhythmEngine{
  constructor({eventBus,appState}={}){this.eventBus=eventBus;this.appState=appState;}
  token(){return localStorage.getItem("blueCurrentV3230Token")||"";}
  locationId(){const s=this.appState?.getState?.()||{};return s.activeLocationId||s.selectedLocationId||s.auth?.locationId||"loc_marina";}
  headers(){return {"Content-Type":"application/json",Authorization:`Bearer ${this.token()}`};}
  async snapshot(){const r=await fetch(`/api/manager-operating-rhythm?locationId=${encodeURIComponent(this.locationId())}`,{headers:{Authorization:`Bearer ${this.token()}`}}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Manager rhythm failed (${r.status})`);this.appState?.update?.({managerOperatingRhythm:d});this.eventBus?.emit?.("manager-rhythm:updated",structuredClone(d));return d;}
  async post(path,payload={}){const r=await fetch(`/api/manager-operating-rhythm/${path}`,{method:"POST",headers:this.headers(),body:JSON.stringify({locationId:this.locationId(),...payload})}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Manager rhythm ${path} failed (${r.status})`);this.eventBus?.emit?.(`manager-rhythm:${path}`,structuredClone(d));return d;}
  plan(payload){return this.post("plan",payload);}
  handoff(payload){return this.post("handoff",payload);}
  closeout(payload){return this.post("closeout",payload);}
}
if(typeof module!=="undefined"&&module.exports)module.exports=BlueCurrentManagerOperatingRhythmEngine;
if(global)global.BlueCurrentManagerOperatingRhythmEngine=BlueCurrentManagerOperatingRhythmEngine;
})(typeof window!=="undefined"?window:globalThis);