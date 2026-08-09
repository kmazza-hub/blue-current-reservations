(function(global){"use strict";
class BlueCurrentPilotOperationalReadinessEngine{
  constructor({appState}={}){this.appState=appState;}
  token(){return localStorage.getItem("blueCurrentV3230Token")||"";}
  async snapshot(){const r=await fetch("/api/pilot-operational-readiness",{headers:{Authorization:`Bearer ${this.token()}`}}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Pilot readiness failed (${r.status})`);this.appState?.update?.({pilotOperationalReadiness:d});return d;}
}
if(typeof module!=="undefined"&&module.exports)module.exports=BlueCurrentPilotOperationalReadinessEngine;
if(global)global.BlueCurrentPilotOperationalReadinessEngine=BlueCurrentPilotOperationalReadinessEngine;
})(typeof window!=="undefined"?window:globalThis);