(function(global){"use strict";
class BlueCurrentRetirementRehearsalEngine{
  constructor({eventBus,appState}={}){this.eventBus=eventBus;this.appState=appState;}
  token(){return localStorage.getItem("blueCurrentV3230Token")||"";}
  plans(){try{return this.appState?.getState?.().operatorDeletionPlans||[];}catch{return [];}}
  eligiblePlans(){return this.plans().filter(x=>x.status==="human-authorized-plan"&&x.codeDeletionAllowed===false&&x.deletionExecuted===false);}
  async rehearse(surfaceId){const r=await fetch("/api/operator-fine-comb/retirement-rehearsal",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${this.token()}`},body:JSON.stringify({surfaceId})}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Retirement rehearsal failed (${r.status})`);const current=this.appState?.getState?.().operatorRetirementRehearsals||[],next=[d,...current.filter(x=>x.surfaceId!==d.surfaceId)].slice(0,50);this.appState?.update?.({operatorRetirementRehearsals:next});this.eventBus?.emit?.("operator-retirement-rehearsal:completed",structuredClone(d));return d;}
  readiness(result){const checks=[
    {id:"disposable-copy",pass:result?.safety?.tempCopyUsed===true,detail:result?.mode||"not run"},
    {id:"authoritative-safety",pass:result?.safety?.authoritativeMutation===false&&result?.safety?.authoritativeSafe===true,detail:"Authoritative repository unchanged"},
    {id:"validator",pass:result?.validation?.passed===true,detail:result?.validation?.validator?.stdout?.trim().split("\n").slice(-1)[0]||"not run"},
    {id:"startup-cleanup",pass:(result?.after?.graph?.startupDependencies||[]).length===0,detail:`${result?.after?.graph?.startupDependencies?.length||0} remaining`},
    {id:"api-cleanup",pass:(result?.after?.graph?.apiUsage||[]).length===0,detail:`${result?.after?.graph?.apiUsage?.length||0} remaining`},
    {id:"rollback-archive",pass:Boolean(result?.rollback?.digest)&&result?.rollback?.fileCount>0,detail:result?.rollback?.file||"missing"},
    {id:"change-set",pass:(result?.changeSet?.changeCount||0)>0,detail:`${result?.changeSet?.changeCount||0} simulated change(s)`},
    {id:"no-delete-capability",pass:result?.safety?.codeDeletionAllowed===false&&result?.safety?.deletionExecuted===false&&result?.safety?.deleteEndpointPresent===false,detail:"No authoritative delete capability"}
  ];const score=Math.round(checks.reduce((s,x)=>s+(x.pass?100:0),0)/checks.length);return {score,status:score===100&&result?.readiness?.blockers?.length===0?"retirement-rehearsal-certified":score>=63?"conditional":"blocked",checks,blockers:result?.readiness?.blockers||[],codeDeletionAllowed:false,deletionExecuted:false,version:"46.40.0"};}
  snapshot(){const items=this.appState?.getState?.().operatorRetirementRehearsals||[],latest=items[0]||null;return {eligiblePlans:this.eligiblePlans(),rehearsals:items,latest,readiness:latest?this.readiness(latest):null,policy:"simulate-on-disposable-copy-before-any-authoritative-change",codeDeletionAllowed:false,deletionExecuted:false,version:"46.40.0"};}
}
if(typeof module!=="undefined"&&module.exports)module.exports=BlueCurrentRetirementRehearsalEngine;
if(global)global.BlueCurrentRetirementRehearsalEngine=BlueCurrentRetirementRehearsalEngine;
})(typeof window!=="undefined"?window:globalThis);