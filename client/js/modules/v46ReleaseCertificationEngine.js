(function(global){"use strict";
class BlueCurrentV46ReleaseCertificationEngine{
  constructor({eventBus,appState}={}){this.eventBus=eventBus;this.appState=appState;}
  token(){return localStorage.getItem("blueCurrentV3230Token")||"";}
  async snapshot(){const r=await fetch("/api/operator-fine-comb/v46-certification",{headers:{Authorization:`Bearer ${this.token()}`}}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`V46 certification failed (${r.status})`);this.appState?.update?.({v46ReleaseCertification:d});this.eventBus?.emit?.("v46-release-certification:updated",structuredClone(d));return d;}
}
if(typeof module!=="undefined"&&module.exports)module.exports=BlueCurrentV46ReleaseCertificationEngine;
if(global)global.BlueCurrentV46ReleaseCertificationEngine=BlueCurrentV46ReleaseCertificationEngine;
})(typeof window!=="undefined"?window:globalThis);