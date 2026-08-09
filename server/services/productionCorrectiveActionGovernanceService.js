"use strict";

class ProductionCorrectiveActionGovernanceService {
  constructor(database,auditService,realtimeHub,productionRecoveryReviewService,productionIncidentCommandService){
    Object.assign(this,{database,auditService,realtimeHub,productionRecoveryReviewService,productionIncidentCommandService});
  }
  now(){return new Date().toISOString();}
  ageDays(dueDate,now=new Date()){
    if(!dueDate)return null;
    const d=new Date(`${dueDate}T23:59:59.999Z`);
    if(!Number.isFinite(d.getTime()))return null;
    return Math.floor((now-d)/86400000);
  }
  async evidence(organizationId){
    const db=await this.database.read();
    return (db.productionCorrectiveActionEvidence||[])
      .filter(x=>x.organizationId===organizationId)
      .sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  }
  async snapshot(organizationId,allowedLocationIds){
    const [recovery,incident,evidence]=await Promise.all([
      this.productionRecoveryReviewService.snapshot(organizationId,allowedLocationIds),
      this.productionIncidentCommandService.snapshot(organizationId,allowedLocationIds),
      this.evidence(organizationId)
    ]);
    const incidentById=new Map((incident.commandHistory||[]).map(x=>[x.id,x]));
    const evidenceByKey=new Map();
    for(const e of evidence){
      const k=`${e.reviewId}:${e.actionId}`;
      if(!evidenceByKey.has(k))evidenceByKey.set(k,[]);
      evidenceByKey.get(k).push(e);
    }
    const now=new Date();
    const actions=[];
    for(const review of recovery.reviewHistory||[]){
      const incidentRecord=incidentById.get(review.incidentId)||{};
      for(const action of review.correctiveActions||[]){
        const key=`${review.id}:${action.id}`;
        const actionEvidence=evidenceByKey.get(key)||[];
        const latest=actionEvidence[0]||null;
        const overdueDays=this.ageDays(action.dueDate,now);
        const completed=latest?.status==="COMPLETION_ACCEPTED";
        const verified=completed||latest?.status==="RISK_REDUCTION_VERIFIED";
        const repeatLinks=(incident.commandHistory||[]).filter(x=>
          x.id!==review.incidentId &&
          x.createdAt>review.createdAt &&
          (x.affectedDomains||[]).some(d=>(incidentRecord.affectedDomains||[]).includes(d))
        ).map(x=>({incidentId:x.id,title:x.title,severity:x.severity,createdAt:x.createdAt}));
        actions.push({
          reviewId:review.id,incidentId:review.incidentId,incidentTitle:review.incidentTitle,
          incidentSeverity:incidentRecord.severity||"unknown",
          repeatRisk:review.repeatRisk,
          actionId:action.id,action:action.action,owner:action.owner,dueDate:action.dueDate||null,
          ageDaysPastDue:overdueDays,
          overdue:!completed&&overdueDays!==null&&overdueDays>0,
          highRisk:["high","critical"].includes(review.repeatRisk),
          status:completed?"COMPLETED_ACCEPTED":verified?"RISK_REDUCTION_VERIFIED":"OPEN",
          executionState:action.executionState||"NOT_EXECUTED_BY_BLUE_CURRENT",
          latestEvidence:latest,
          evidenceHistory:actionEvidence,
          repeatIncidentLinks:repeatLinks
        });
      }
    }
    const ownerMap=new Map();
    for(const a of actions){
      if(!ownerMap.has(a.owner))ownerMap.set(a.owner,{owner:a.owner,total:0,open:0,overdue:0,highRisk:0,verified:0,completed:0});
      const x=ownerMap.get(a.owner);x.total++;
      if(a.status==="OPEN")x.open++;
      if(a.overdue)x.overdue++;
      if(a.highRisk&&a.status!=="COMPLETED_ACCEPTED")x.highRisk++;
      if(a.status==="RISK_REDUCTION_VERIFIED")x.verified++;
      if(a.status==="COMPLETED_ACCEPTED")x.completed++;
    }
    const open=actions.filter(x=>x.status!=="COMPLETED_ACCEPTED");
    return {
      version:"50.25.0",generatedAt:this.now(),
      status:actions.length===0?"corrective-actions-required":
        open.some(x=>x.overdue&&x.highRisk)?"corrective-governance-critical":
        open.some(x=>x.overdue||x.highRisk)?"corrective-governance-attention":
        open.length?"corrective-governance-active":"corrective-governance-complete",
      headline:actions.length===0?"Accepted post-incident reviews with corrective actions are required before governance begins.":`${actions.filter(x=>x.status==="COMPLETED_ACCEPTED").length}/${actions.length} corrective action(s) have human-accepted completion.`,
      totals:{
        actions:actions.length,
        open:open.length,
        overdue:actions.filter(x=>x.overdue).length,
        highRiskOpen:actions.filter(x=>x.highRisk&&x.status!=="COMPLETED_ACCEPTED").length,
        riskReductionVerified:actions.filter(x=>x.status==="RISK_REDUCTION_VERIFIED").length,
        completedAccepted:actions.filter(x=>x.status==="COMPLETED_ACCEPTED").length,
        repeatIncidentLinks:actions.reduce((n,x)=>n+x.repeatIncidentLinks.length,0)
      },
      actions,
      ownerAccountability:[...ownerMap.values()].sort((a,b)=>(b.overdue+b.highRisk)-(a.overdue+a.highRisk)||b.open-a.open),
      evidenceHistory:evidence,
      policy:{
        actionExecutionHumanOwned:true,
        verificationEvidenceHumanRecorded:true,
        completionAcceptanceHumanRequired:true,
        repeatIncidentLinkageAdvisory:true,
        automaticCorrectiveActionExecution:false,
        automaticCompletion:false,
        autonomousProductionChanges:false
      }
    };
  }
  async verify(organizationId,allowedLocationIds,reviewId,actionId,input,actor){
    const snap=await this.snapshot(organizationId,allowedLocationIds);
    const action=snap.actions.find(x=>x.reviewId===reviewId&&x.actionId===actionId);
    if(!action)throw new Error("Corrective action not found.");
    const evidence=String(input.evidence||"").trim().slice(0,1800);
    if(!evidence)throw new Error("Human-recorded risk-reduction evidence is required.");
    const verification=String(input.verification||"").trim().slice(0,1200);
    if(!verification)throw new Error("Verification method/result is required.");
    const now=this.now();
    const record={
      id:`cae_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      organizationId,reviewId,incidentId:action.incidentId,actionId,
      action:action.action,owner:action.owner,
      status:"RISK_REDUCTION_VERIFIED",
      evidence,verification,
      repeatRiskAtVerification:action.repeatRisk,
      repeatIncidentLinksAtVerification:action.repeatIncidentLinks,
      createdBy:actor,createdAt:now,
      correctiveActionExecutedBySystem:false,
      runtimeMutationPerformed:false
    };
    await this.database.mutate(db=>{db.productionCorrectiveActionEvidence||=[];db.productionCorrectiveActionEvidence.push(record);return record;});
    await this.auditService.record({organizationId,actor,action:`Risk-reduction evidence verified for corrective action ${reviewId}/${actionId}; execution remains human-owned`,category:"production_learning"});
    this.realtimeHub.publish("production-learning:action-verified",{id:record.id,organizationId,reviewId,actionId});
    return record;
  }
  async acceptCompletion(organizationId,allowedLocationIds,reviewId,actionId,input,actor){
    const snap=await this.snapshot(organizationId,allowedLocationIds);
    const action=snap.actions.find(x=>x.reviewId===reviewId&&x.actionId===actionId);
    if(!action)throw new Error("Corrective action not found.");
    if(action.status!=="RISK_REDUCTION_VERIFIED")throw new Error("Risk-reduction evidence must be verified before completion can be accepted.");
    const approver=String(input.approver||actor||"").trim().slice(0,160);
    const note=String(input.note||"").trim().slice(0,1500);
    if(!approver)throw new Error("Completion approver is required.");
    if(!note)throw new Error("Human completion acceptance note is required.");
    const now=this.now();
    const record={
      id:`cae_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      organizationId,reviewId,incidentId:action.incidentId,actionId,
      action:action.action,owner:action.owner,
      status:"COMPLETION_ACCEPTED",
      approver,note,createdBy:actor,createdAt:now,
      correctiveActionExecutedBySystem:false,
      runtimeMutationPerformed:false
    };
    await this.database.mutate(db=>{db.productionCorrectiveActionEvidence||=[];db.productionCorrectiveActionEvidence.push(record);return record;});
    await this.auditService.record({organizationId,actor,action:`Corrective action completion accepted for ${reviewId}/${actionId} by ${approver}; Blue Current did not execute the action`,category:"production_learning"});
    this.realtimeHub.publish("production-learning:action-completed",{id:record.id,organizationId,reviewId,actionId,approver});
    return record;
  }
}
module.exports=ProductionCorrectiveActionGovernanceService;
