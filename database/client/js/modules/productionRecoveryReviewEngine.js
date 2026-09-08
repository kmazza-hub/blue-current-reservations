(function(global){"use strict";
class BlueCurrentProductionRecoveryReviewEngine{
  constructor({eventBus,appState}={}){this.eventBus=eventBus;this.appState=appState;}
  token(){return localStorage.getItem("blueCurrentV3230Token")||"";}
  headers(){return {Authorization:`Bearer ${this.token()}`};}
  async snapshot(){const r=await fetch("/api/production-recovery-review",{headers:this.headers()}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Production recovery review failed (${r.status})`);this.appState?.update?.({productionRecoveryReview:d});return d;}
  async createReview(incidentId,payload={}){const r=await fetch(`/api/production-recovery-review/incidents/${encodeURIComponent(incidentId)}/review`,{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Post-incident review creation failed (${r.status})`);this.eventBus?.emit?.("production-recovery:review-created",structuredClone(d));return d;}
  async acceptLessons(reviewId,payload={}){const r=await fetch(`/api/production-recovery-review/reviews/${encodeURIComponent(reviewId)}/accept-lessons`,{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Lessons acceptance failed (${r.status})`);this.eventBus?.emit?.("production-recovery:lessons-accepted",structuredClone(d));return d;}
}
if(typeof module!=="undefined"&&module.exports)module.exports=BlueCurrentProductionRecoveryReviewEngine;
if(global)global.BlueCurrentProductionRecoveryReviewEngine=BlueCurrentProductionRecoveryReviewEngine;
})(typeof window!=="undefined"?window:globalThis);