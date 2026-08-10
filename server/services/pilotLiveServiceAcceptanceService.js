"use strict";

class PilotLiveServiceAcceptanceService {
  constructor(database,auditService,realtimeHub,pilotReleaseCandidateCertificationService,pilotExecutionObservationService,pilotValueScorecardService){
    Object.assign(this,{database,auditService,realtimeHub,pilotReleaseCandidateCertificationService,pilotExecutionObservationService,pilotValueScorecardService});
  }
  now(){return new Date().toISOString();}
  async reviews(org){
    const db=await this.database.read();
    return (db.pilotLiveServiceAcceptanceReviews||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.reviewedAt)-new Date(a.reviewedAt));
  }
  async decisions(org){
    const db=await this.database.read();
    return (db.pilotLiveServiceAcceptanceDecisions||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.decidedAt)-new Date(a.decidedAt));
  }
  async snapshot(org,allowed){
    const [rc,execution,value,reviews,decisions]=await Promise.all([
      this.pilotReleaseCandidateCertificationService.snapshot(org,allowed),
      this.pilotExecutionObservationService.snapshot(org,allowed),
      this.pilotValueScorecardService.snapshot(org,allowed),
      this.reviews(org),this.decisions(org)
    ]);

    const locations=(execution.locations||[]).map(loc=>{
      const review=reviews.find(x=>x.locationId===loc.locationId)||null;
      const decision=decisions.find(x=>x.locationId===loc.locationId)||null;
      const latest=loc.latestObservation||null;
      const healthy=!!latest&&Object.values(latest.health||{}).every(Boolean);
      const milestonesComplete=loc.confirmedMilestones===loc.totalMilestones&&loc.totalMilestones>0;
      const noSevere=Number(loc.highCriticalIncidents||0)===0;
      const checks=[
        {id:"PILOT_RC_CERTIFIED",passed:rc.certification?.decision==="RC_APPROVE"||rc.rcReady===true,actual:rc.status},
        {id:"EXECUTION_SESSION",passed:!!loc.session,actual:loc.session?.status||"not started"},
        {id:"EXECUTION_MILESTONES",passed:milestonesComplete,actual:`${loc.confirmedMilestones}/${loc.totalMilestones}`},
        {id:"LIVE_HEALTH",passed:healthy,actual:latest?Object.entries(latest.health||{}).filter(([,v])=>!v).map(([k])=>k).join(", ")||"healthy":"not observed"},
        {id:"NO_HIGH_CRITICAL_INCIDENTS",passed:noSevere,actual:`${loc.highCriticalIncidents||0} high/critical incident observation(s)`},
        {id:"OPERATOR_ACCEPTANCE",passed:review?.operatorAcceptance==="PASS",actual:review?.operatorAcceptance||"not reviewed"},
        {id:"MANAGER_ACCEPTANCE",passed:review?.managerAcceptance==="PASS",actual:review?.managerAcceptance||"not reviewed"},
        {id:"GUEST_IMPACT",passed:review?.guestImpact==="PASS",actual:review?.guestImpact||"not reviewed"},
        {id:"WORKFLOW_ACCEPTANCE",passed:review?.workflowAcceptance==="PASS",actual:review?.workflowAcceptance||"not reviewed"},
        {id:"SUPPORT_BURDEN",passed:review?.supportBurden==="PASS",actual:review?.supportBurden||"not reviewed"},
        {id:"DATA_CONFIDENCE",passed:review?.dataConfidence==="PASS",actual:review?.dataConfidence||"not reviewed"},
        {id:"KPI_OBSERVATION",passed:!!review?.kpiObservation,actual:review?.kpiObservation?"recorded":"missing"},
        {id:"INCIDENT_SUMMARY",passed:!!review?.incidentSummary,actual:review?.incidentSummary?"recorded":"missing"},
        {id:"LIVE_SERVICE_EVIDENCE",passed:!!review?.liveServiceEvidence,actual:review?.liveServiceEvidence?"recorded":"missing"},
        {id:"HUMAN_ACCEPT_EXTEND_HOLD",passed:!!decision,actual:decision?.decision||"not decided"}
      ];
      return {
        locationId:loc.locationId,locationName:loc.locationName,
        executionState:loc.executionState,session:loc.session,
        latestObservation:latest,milestones:loc.milestones,
        review,decision,checks,
        passed:checks.filter(x=>x.passed).length,total:checks.length,
        acceptanceReady:checks.slice(0,-1).every(x=>x.passed),
        state:decision?.decision==="ACCEPT"?"LIVE_SERVICE_ACCEPTED":
              decision?.decision==="EXTEND"?"PILOT_EXTENSION_REQUIRED":
              decision?.decision==="HOLD"?"PILOT_ACCEPTANCE_HOLD":
              review?"LIVE_SERVICE_REVIEWED":"LIVE_SERVICE_REVIEW_REQUIRED"
      };
    });

    return {
      version:"57.50.0",generatedAt:this.now(),
      status:locations.some(x=>x.decision?.decision==="ACCEPT")?"pilot-live-service-accepted":
             locations.some(x=>x.review)?"pilot-live-service-in-review":"pilot-live-service-review-required",
      headline:`${locations.filter(x=>x.acceptanceReady).length}/${locations.length} location(s) satisfy live-service acceptance gates.`,
      locations,
      releaseCandidate:{status:rc.status,ready:rc.rcReady,releaseVersion:rc.releaseCandidate?.releaseVersion||null},
      valueScorecard:{status:value.status,scorecard:value.scorecard||null,evidence:value.evidence||null},
      policy:{
        pilotRcRequired:true,
        executionEvidenceRequired:true,
        milestoneEvidenceRequired:true,
        liveHealthRequired:true,
        operatorAcceptanceRequired:true,
        managerAcceptanceRequired:true,
        guestImpactReviewRequired:true,
        supportBurdenReviewRequired:true,
        dataConfidenceRequired:true,
        humanAcceptExtendHoldRequired:true,
        acceptanceDoesNotStartRuntime:true,
        acceptanceDoesNotDeploy:true,
        acceptanceDoesNotRollback:true,
        acceptanceDoesNotMutateRestaurantState:true,
        autonomousProductionChanges:false
      }
    };
  }
  async review(org,allowed,locationId,input,actor){
    const execution=await this.pilotExecutionObservationService.snapshot(org,allowed);
    const loc=(execution.locations||[]).find(x=>x.locationId===locationId);
    if(!loc)throw new Error("Pilot location not found.");
    if(!loc.session)throw new Error("Pilot execution evidence is required before live-service acceptance review.");
    for(const k of ["operatorAcceptance","managerAcceptance","guestImpact","workflowAcceptance","supportBurden","dataConfidence"]){
      if(!["PASS","FAIL"].includes(String(input[k]||"").toUpperCase()))throw new Error(`${k} must be PASS or FAIL.`);
    }
    const kpiObservation=String(input.kpiObservation||"").trim();
    const incidentSummary=String(input.incidentSummary||"").trim();
    const liveServiceEvidence=String(input.liveServiceEvidence||"").trim();
    if(!kpiObservation||!incidentSummary||!liveServiceEvidence)throw new Error("KPI observation, incident summary, and live-service evidence are required.");
    const record={
      id:`plsa_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      organizationId:org,locationId,locationName:loc.locationName,
      reviewedAt:this.now(),reviewedBy:actor,
      operatorAcceptance:String(input.operatorAcceptance).toUpperCase(),
      managerAcceptance:String(input.managerAcceptance).toUpperCase(),
      guestImpact:String(input.guestImpact).toUpperCase(),
      workflowAcceptance:String(input.workflowAcceptance).toUpperCase(),
      supportBurden:String(input.supportBurden).toUpperCase(),
      dataConfidence:String(input.dataConfidence).toUpperCase(),
      kpiObservation:kpiObservation.slice(0,5000),
      incidentSummary:incidentSummary.slice(0,5000),
      liveServiceEvidence:liveServiceEvidence.slice(0,5000),
      note:String(input.note||"").trim().slice(0,2500),
      runtimeStartedByReview:false,deploymentPerformed:false,rollbackPerformed:false,restaurantStateMutated:false
    };
    await this.database.mutate(db=>{db.pilotLiveServiceAcceptanceReviews||=[];db.pilotLiveServiceAcceptanceReviews.push(record);return record;});
    await this.auditService.record({organizationId:org,actor,action:`Pilot live-service acceptance review recorded for ${locationId}`,category:"pilot_live_service_acceptance"});
    this.realtimeHub.publish("pilot-live-service:reviewed",{organizationId:org,locationId,id:record.id});
    return record;
  }
  async decide(org,allowed,locationId,input,actor){
    const state=await this.snapshot(org,allowed);
    const loc=state.locations.find(x=>x.locationId===locationId);
    if(!loc?.review)throw new Error("Live-service acceptance review is required before decision.");
    const decision=String(input.decision||"").toUpperCase();
    const evidence=String(input.evidence||"").trim(),reason=String(input.reason||"").trim();
    if(!["ACCEPT","EXTEND","HOLD"].includes(decision))throw new Error("Decision must be ACCEPT, EXTEND, or HOLD.");
    if(!evidence)throw new Error("Decision evidence is required.");
    if(decision==="ACCEPT"&&!loc.acceptanceReady&&!reason)throw new Error("ACCEPT with open gates requires an executive override reason.");
    if(["EXTEND","HOLD"].includes(decision)&&!reason)throw new Error(`${decision} requires a documented reason.`);
    const record={
      id:`plsad_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      organizationId:org,locationId,locationName:loc.locationName,decision,
      decidedAt:this.now(),decidedBy:actor,evidence:evidence.slice(0,5000),reason:reason.slice(0,2500),
      gateSnapshot:loc.checks,
      runtimeStartedByDecision:false,deploymentPerformedByDecision:false,rollbackPerformedByDecision:false,
      restaurantStateMutatedByDecision:false,autonomousProductionChanges:false
    };
    await this.database.mutate(db=>{db.pilotLiveServiceAcceptanceDecisions||=[];db.pilotLiveServiceAcceptanceDecisions.push(record);return record;});
    await this.auditService.record({organizationId:org,actor,action:`Pilot live-service decision ${decision} recorded for ${locationId}; no runtime/deployment action executed`,category:"pilot_live_service_acceptance"});
    this.realtimeHub.publish("pilot-live-service:decision",{organizationId:org,locationId,id:record.id,decision});
    return record;
  }
}
module.exports=PilotLiveServiceAcceptanceService;
