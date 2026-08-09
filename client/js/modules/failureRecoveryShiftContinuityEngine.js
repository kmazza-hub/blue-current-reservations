(function(global){"use strict";
class BlueCurrentFailureRecoveryShiftContinuityEngine{
 constructor({eventBus,appState}={}){this.eventBus=eventBus;this.appState=appState;}
 token(){return localStorage.getItem("blueCurrentV3230Token")||"";} headers(){return{Authorization:`Bearer ${this.token()}`};}
 async snapshot(){const r=await fetch("/api/failure-recovery-shift-continuity",{headers:this.headers()}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Failure recovery failed (${r.status})`);this.appState?.update?.({failureRecoveryShiftContinuity:d});return d;}
 async rehearse(id,payload){const r=await fetch(`/api/failure-recovery-shift-continuity/locations/${encodeURIComponent(id)}/rehearse`,{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Recovery rehearsal failed (${r.status})`);this.eventBus?.emit?.("failure-recovery-shift:rehearsed",d);return d;}
 async decide(id,payload){const r=await fetch(`/api/failure-recovery-shift-continuity/locations/${encodeURIComponent(id)}/decision`,{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Recovery decision failed (${r.status})`);this.eventBus?.emit?.("failure-recovery-shift:decision",d);return d;}
}
if(global)global.BlueCurrentFailureRecoveryShiftContinuityEngine=BlueCurrentFailureRecoveryShiftContinuityEngine;})(window);