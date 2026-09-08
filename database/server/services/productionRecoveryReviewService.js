"use strict";

class ProductionRecoveryReviewService {
  constructor(database,auditService,realtimeHub,productionIncidentCommandService,productionHealthSupportService,reliabilityAutomationService){
    Object.assign(this,{database,auditService,realtimeHub,productionIncidentCommandService,productionHealthSupportService,reliabilityAutomationService});
  }
  now(){return new Date().toISOString();}
  async reviews(organizationId){
    const db=await this.database.read();
    return (db.productionRecoveryReviews||[])
      .filter(x=>x.organizationId===organizationId)
      .sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  }
  async snapshot(organizationId,allowedLocationIds){
    const [incidentSnapshot,support,reliability,reviews]=await Promise.all([
      this.productionIncidentCommandService.snapshot(organizationId,allowedLocationIds),
      this.productionHealthSupportService.snapshot(organizationId,allowedLocationIds),
      this.reliabilityAutomationService.evaluate(organizationId),
      this.reviews(organizationId)
    ]);
    const supportMap=new Map((support.locations||[]).map(x=>[x.locationId,x]));
    const latestReview=new Map();
    for(const r of reviews)if(!latestReview.has(r.incidentId))latestReview.set(r.incidentId,r);

    const resolvedIncidents=(incidentSnapshot.commandHistory||[]).filter(x=>x.status==="resolved");
    const incidents=resolvedIncidents.map(incident=>{
      const affected=(incident.affectedLocationIds||[]).map(locationId=>{
        const loc=supportMap.get(locationId)||{};
        const checks=[
          {id:"support-health",label:"Production support health is not critical",passed:loc.healthState!=="critical",actual:loc.healthState||"unknown"},
          {id:"readiness",label:"Restaurant readiness is at least 70",passed:Number(loc.readinessScore||0)>=70,actual:Number(loc.readinessScore||0)},
          {id:"open-support",label:"No open critical support event",passed:Number(loc.openSupportEvents||0)===0,actual:Number(loc.openSupportEvents||0)}
        ];
        const passed=checks.filter(x=>x.passed).length;
        return {locationId,locationName:loc.locationName||locationId,checks,passed,total:checks.length,recovered:passed===checks.length};
      });
      const review=latestReview.get(incident.id)||null;
      const createdAt=new Date(incident.createdAt||0),resolvedAt=new Date(incident.resolvedAt||incident.updatedAt||0);
      const durationMinutes=Number.isFinite(createdAt.getTime())&&Number.isFinite(resolvedAt.getTime())&&resolvedAt>=createdAt
        ? Math.round((resolvedAt-createdAt)/60000):null;
      const recoveryVerified=affected.length?affected.every(x=>x.recovered):reliability.status!=="breached";
      return {
        incidentId:incident.id,title:incident.title,severity:incident.severity,
        commander:incident.commander,
        createdAt:incident.createdAt,resolvedAt:incident.resolvedAt||incident.updatedAt,
        durationMinutes,
        businessImpact:incident.businessImpact||"",
        serviceImpact:incident.serviceImpact||"",
        resolution:incident.resolution||"",
        recoveryEvidence:incident.recoveryEvidence||[],
        affectedLocations:affected,
        recoveryVerified,
        platformReliability:{status:reliability.status,score:reliability.score,breached:reliability.breached,warning:reliability.warning,errorBudgetRemaining:reliability.errorBudgetRemaining},
        review,
        reviewState:review?.status||"NOT_REVIEWED"
      };
    });
    return {
      version:"50.20.0",generatedAt:this.now(),
      status:incidents.length===0?"resolved-incident-required":incidents.every(x=>x.review?.status==="POST_INCIDENT_REVIEW_ACCEPTED")?"post-incident-review-complete":"post-incident-review-open",
      headline:incidents.length===0?"A human-resolved production incident is required before recovery review.":`${incidents.filter(x=>x.recoveryVerified).length}/${incidents.length} resolved incident(s) currently pass recovery verification.`,
      incidents,reviewHistory:reviews,
      policy:{
        recoveryVerificationReadOnly:true,
        rootCauseHumanAuthored:true,
        correctiveActionsHumanOwned:true,
        lessonsAcceptanceHumanRequired:true,
        automaticCorrectiveActionExecution:false,
        automaticClosure:false,
        autonomousProductionChanges:false
      }
    };
  }
  normalizeActions(value){
    if(!Array.isArray(value))return [];
    return value.slice(0,30).map((x,i)=>({
      id:`ca_${i+1}`,
      action:String(x.action||"").trim().slice(0,800),
      owner:String(x.owner||"").trim().slice(0,160),
      dueDate:String(x.dueDate||"").trim().slice(0,40),
      status:"OPEN",
      executionState:"NOT_EXECUTED_BY_BLUE_CURRENT"
    })).filter(x=>x.action&&x.owner);
  }
  async createReview(organizationId,allowedLocationIds,incidentId,input,actor){
    const snap=await this.snapshot(organizationId,allowedLocationIds);
    const incident=snap.incidents.find(x=>x.incidentId===incidentId);
    if(!incident)throw new Error("Resolved production incident not found in post-incident review.");
    const rootCause=String(input.rootCause||"").trim().slice(0,2200);
    if(!rootCause)throw new Error("Human-authored root cause is required.");
    const contributingFactors=(Array.isArray(input.contributingFactors)?input.contributingFactors:[]).map(String).map(x=>x.trim()).filter(Boolean).slice(0,20);
    const correctiveActions=this.normalizeActions(input.correctiveActions);
    if(!correctiveActions.length)throw new Error("At least one corrective action with an owner is required.");
    const repeatRisk=String(input.repeatRisk||"medium").toLowerCase();
    if(!["low","medium","high","critical"].includes(repeatRisk))throw new Error("Repeat risk must be low, medium, high, or critical.");
    const executiveSummary=String(input.executiveSummary||"").trim().slice(0,2600);
    if(!executiveSummary)throw new Error("Executive post-incident summary is required.");
    const now=this.now();
    const record={
      id:`pir_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      organizationId,incidentId,
      incidentTitle:incident.title,
      status:"POST_INCIDENT_REVIEW_OPEN",
      createdAt:now,createdBy:actor,
      recoveryVerifiedAtReview:incident.recoveryVerified,
      durationMinutes:incident.durationMinutes,
      businessImpact:incident.businessImpact,
      serviceImpact:incident.serviceImpact,
      rootCause,contributingFactors,correctiveActions,repeatRisk,executiveSummary,
      lessonsAcceptedBy:null,lessonsAcceptedAt:null,
      closureNote:null,
      correctiveActionsExecutedBySystem:false,
      runtimeMutationPerformed:false
    };
    await this.database.mutate(db=>{db.productionRecoveryReviews||=[];db.productionRecoveryReviews.push(record);return record;});
    await this.auditService.record({organizationId,actor,action:`Post-incident review opened for ${incidentId}; ${correctiveActions.length} corrective action(s) recorded`,category:"production_recovery"});
    this.realtimeHub.publish("production-recovery:review-created",{id:record.id,organizationId,incidentId,repeatRisk});
    return record;
  }
  async acceptLessons(organizationId,reviewId,input,actor){
    const approver=String(input.approver||actor||"").trim().slice(0,160);
    if(!approver)throw new Error("Lessons approver is required.");
    const note=String(input.note||"").trim().slice(0,1600);
    if(!note)throw new Error("Human closure / lessons note is required.");
    const now=this.now();
    const record=await this.database.mutate(db=>{
      db.productionRecoveryReviews||=[];
      const x=db.productionRecoveryReviews.find(r=>r.id===reviewId&&r.organizationId===organizationId);
      if(!x)return null;
      x.status="POST_INCIDENT_REVIEW_ACCEPTED";
      x.lessonsAcceptedBy=approver;
      x.lessonsAcceptedAt=now;
      x.closureNote=note;
      return {...x};
    });
    if(!record)throw new Error("Post-incident review not found.");
    await this.auditService.record({organizationId,actor,action:`Post-incident lessons accepted for ${record.incidentId} by ${approver}; corrective actions remain human-owned`,category:"production_recovery"});
    this.realtimeHub.publish("production-recovery:lessons-accepted",{id:record.id,organizationId,incidentId:record.incidentId,approver});
    return record;
  }
}
module.exports=ProductionRecoveryReviewService;
