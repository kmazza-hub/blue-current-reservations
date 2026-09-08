(function(global){"use strict";
class BlueCurrentGoLiveCommandEngine{
  constructor({eventBus,appState}={}){this.eventBus=eventBus;this.appState=appState;}
  token(){return localStorage.getItem("blueCurrentV3230Token")||"";}
  headers(){return {Authorization:`Bearer ${this.token()}`};}
  async snapshot(){const r=await fetch("/api/go-live-command",{headers:this.headers()}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Go-Live Command failed (${r.status})`);this.appState?.update?.({goLiveCommand:d});return d;}
  async authorize(locationId,payload={}){const r=await fetch(`/api/go-live-command/locations/${encodeURIComponent(locationId)}/authorize-execution`,{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Cutover authorization failed (${r.status})`);this.eventBus?.emit?.("go-live-command:authorized",structuredClone(d));return d;}
  async record(locationId,payload={}){const r=await fetch(`/api/go-live-command/locations/${encodeURIComponent(locationId)}/record-result`,{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Cutover result failed (${r.status})`);this.eventBus?.emit?.("go-live-command:result-recorded",structuredClone(d));return d;}
}
if(typeof module!=="undefined"&&module.exports)module.exports=BlueCurrentGoLiveCommandEngine;
if(global)global.BlueCurrentGoLiveCommandEngine=BlueCurrentGoLiveCommandEngine;
})(typeof window!=="undefined"?window:globalThis);