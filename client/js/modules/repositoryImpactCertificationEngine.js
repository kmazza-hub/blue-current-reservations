(function(global){"use strict";
class BlueCurrentRepositoryImpactCertificationEngine{
  constructor({eventBus,appState}={}){this.eventBus=eventBus;this.appState=appState;}
  state(){try{return this.appState?.getState?.()||{};}catch{return {};}}
  token(){return localStorage.getItem("blueCurrentV3230Token")||"";}
  async analyze(surfaceId){const r=await fetch(`/api/operator-fine-comb/repository-impact?surfaceId=${encodeURIComponent(surfaceId)}`,{headers:{Authorization:`Bearer ${this.token()}`}}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Repository impact failed (${r.status})`);this.appState?.update?.({operatorRepositoryImpactLatest:d});this.eventBus?.emit?.("operator-repository-impact:analyzed",structuredClone(d));return d;}
  retirementCertification(surfaceId){const list=this.state().operatorRetirementCertifications||[];return list.find(x=>x.surfaceId===surfaceId&&x.status==="retirement-candidate-certified")||null;}
  deletionPlans(){return Array.isArray(this.state().operatorDeletionPlans)?this.state().operatorDeletionPlans:[];}
  buildPlan(impact){if(!impact?.surfaceId)throw new Error("Repository impact analysis is required.");const retirement=this.retirementCertification(impact.surfaceId);if(!retirement)throw new Error("Retirement-candidate certification is required before deletion planning.");const plan={id:`ODP-${Date.now().toString(36).toUpperCase()}`,surfaceId:impact.surfaceId,status:"draft",impactStatus:impact.status,blockers:[...(impact.blockers||[])],ownedFiles:impact.graph?.ownedFiles||[],inboundReferences:impact.graph?.inboundReferences||[],startupDependencies:impact.graph?.startupDependencies||[],apiUsage:impact.graph?.apiUsage||[],testCoverage:impact.graph?.testCoverage||[],rollback:impact.rollback,retirementCertificationId:retirement.id,humanDeletionAuthorization:null,codeDeletionAllowed:false,deletionExecuted:false,createdAt:new Date().toISOString()};const next=[plan,...this.deletionPlans().filter(x=>x.surfaceId!==plan.surfaceId)].slice(0,100);this.appState?.update?.({operatorDeletionPlans:next});this.eventBus?.emit?.("operator-deletion-plan:created",structuredClone(plan));return plan;}
  authorize(planId,authorizer,note=""){const plans=this.deletionPlans(),plan=plans.find(x=>x.id===planId);if(!plan)throw new Error("Deletion plan not found.");if(plan.blockers.length)throw new Error("Repository-impact blockers must be resolved before deletion authorization.");const auth={authorizedBy:String(authorizer||"Operator"),authorizedAt:new Date().toISOString(),note:String(note||"").slice(0,500),scope:"deletion-plan-only"};const next=plans.map(x=>x.id===planId?{...x,status:"human-authorized-plan",humanDeletionAuthorization:auth,codeDeletionAllowed:false,deletionExecuted:false}:x);this.appState?.update?.({operatorDeletionPlans:next});this.eventBus?.emit?.("operator-deletion-plan:authorized",{planId,authorization:auth});return next.find(x=>x.id===planId);}
  readiness(plan){const checks=[
    {id:"retirement-certification",pass:Boolean(plan?.retirementCertificationId),detail:plan?.retirementCertificationId||"missing"},
    {id:"repository-impact",pass:Boolean(plan?.impactStatus),detail:plan?.impactStatus||"not analyzed"},
    {id:"startup-dependencies",pass:(plan?.startupDependencies||[]).length===0,detail:`${plan?.startupDependencies?.length||0} remaining`},
    {id:"api-usage",pass:(plan?.apiUsage||[]).length===0,detail:`${plan?.apiUsage?.length||0} remaining`},
    {id:"inbound-references",pass:(plan?.inboundReferences||[]).length===0,detail:`${plan?.inboundReferences?.length||0} remaining`},
    {id:"test-coverage",pass:(plan?.testCoverage||[]).length>0,detail:`${plan?.testCoverage?.length||0} direct test reference(s)`},
    {id:"rollback-plan",pass:Boolean(plan?.rollback?.digest)&&Array.isArray(plan?.rollback?.filesToBackup),detail:plan?.rollback?.digest?.slice(0,12)||"missing"},
    {id:"human-authorization",pass:Boolean(plan?.humanDeletionAuthorization),detail:plan?.humanDeletionAuthorization?.authorizedBy||"not authorized"},
    {id:"no-delete-capability",pass:plan?.codeDeletionAllowed===false&&plan?.deletionExecuted===false,detail:"Planning/authorization only; code deletion disabled"}
  ];const score=Math.round(checks.reduce((s,x)=>s+(x.pass?100:0),0)/checks.length);return {score,status:score===100?"deletion-plan-certified":score>=56?"conditional":"blocked",checks,codeDeletionAllowed:false,deletionExecuted:false,version:"46.35.0"};}
  snapshot(){const plans=this.deletionPlans(),latest=plans[0]||null;return {count:plans.length,latest,readiness:latest?this.readiness(latest):null,policy:"analyze-plan-authorize-never-delete-in-v46.35",codeDeletionAllowed:false,deletionExecuted:false,version:"46.35.0"};}
}
if(typeof module!=="undefined"&&module.exports)module.exports=BlueCurrentRepositoryImpactCertificationEngine;
if(global)global.BlueCurrentRepositoryImpactCertificationEngine=BlueCurrentRepositoryImpactCertificationEngine;
})(typeof window!=="undefined"?window:globalThis);