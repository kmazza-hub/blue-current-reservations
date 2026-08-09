(function(global){"use strict";
class BlueCurrentV50ReleaseCertificationEngine{
  constructor({appState}={}){this.appState=appState;}
  token(){return localStorage.getItem("blueCurrentV3230Token")||"";}
  async snapshot(){const r=await fetch("/api/v50-release-certification",{headers:{Authorization:`Bearer ${this.token()}`}}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`V50 certification failed (${r.status})`);this.appState?.update?.({v50ReleaseCertification:d});return d;}
}
if(typeof module!=="undefined"&&module.exports)module.exports=BlueCurrentV50ReleaseCertificationEngine;
if(global)global.BlueCurrentV50ReleaseCertificationEngine=BlueCurrentV50ReleaseCertificationEngine;
})(typeof window!=="undefined"?window:globalThis);