(function(global){"use strict";
class BlueCurrentV52OperationalReadinessEngine{
 constructor({eventBus,appState}={}){this.eventBus=eventBus;this.appState=appState;}
 token(){return localStorage.getItem("blueCurrentV3230Token")||"";} headers(){return{Authorization:`Bearer ${this.token()}`};}
 async snapshot(){const r=await fetch("/api/v52-operational-readiness",{headers:this.headers()}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`V52 readiness failed (${r.status})`);this.appState?.update?.({v52OperationalReadiness:d});return d;}
 async review(payload){const r=await fetch("/api/v52-operational-readiness/review",{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`V52 closure review failed (${r.status})`);this.eventBus?.emit?.("v52-operational-readiness:reviewed",d);return d;}
 async certify(payload){const r=await fetch("/api/v52-operational-readiness/certify",{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`V52 certification failed (${r.status})`);this.eventBus?.emit?.("v52-operational-readiness:certified",d);return d;}
}
if(global)global.BlueCurrentV52OperationalReadinessEngine=BlueCurrentV52OperationalReadinessEngine;})(window);