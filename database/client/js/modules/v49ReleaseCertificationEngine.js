(function(global){"use strict";
class BlueCurrentV49ReleaseCertificationEngine{
  constructor({appState}={}){this.appState=appState;}
  token(){return localStorage.getItem("blueCurrentV3230Token")||"";}
  async snapshot(){const r=await fetch("/api/v49-release-certification",{headers:{Authorization:`Bearer ${this.token()}`}}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`V49 certification failed (${r.status})`);this.appState?.update?.({v49ReleaseCertification:d});return d;}
}
if(typeof module!=="undefined"&&module.exports)module.exports=BlueCurrentV49ReleaseCertificationEngine;
if(global)global.BlueCurrentV49ReleaseCertificationEngine=BlueCurrentV49ReleaseCertificationEngine;
})(typeof window!=="undefined"?window:globalThis);