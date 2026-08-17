"use strict";

class CommercialOperationsSupportReadinessService {
  constructor(database,auditService,realtimeHub,endToEndValidationService,productionHealthSupportService,productionIncidentCommandService,productionRecoveryReviewService){
    Object.assign(this,{database,auditService,realtimeHub,endToEndValidationService,productionHealthSupportService,productionIncidentCommandService,productionRecoveryReviewService});
  }
  now(){return new Date().toISOString();}
  async records(org){
    const db=await this.database.read();
    return (db.commercialOperationsSupportReadiness||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  }
  async snapshot(org,allowed){
    const [validation,health,incidents,recovery,records]=await Promise.all([
      this.endToEndValidationService.snapshot(org,allowed),
      this.productionHealthSupportService.snapshot(org,allowed),
      this.productionIncidentCommandService.snapshot(org,allowed),
      this.productionRecoveryReviewService.snapshot(org,allowed),
      this.records(org)
    ]);
    const latest=records[0]||null;
    const criticalIncidents=(incidents.activeCommands||[]).filter(x=>String(x.severity||"").toLowerCase()==="critical");
    const openRecovery=(recovery.incidents||[]).filter(x=>x.reviewState!=="POST_INCIDENT_REVIEW_ACCEPTED");
    const checks=[
      {id:"RC_END_TO_END_VALIDATED",passed:validation.validated===true,actual:validation.status},
      {id:"SUPPORT_OWNER_ASSIGNED",passed:!!latest?.supportOwner,actual:latest?.supportOwner||"missing"},
      {id:"ESCALATION_OWNER_ASSIGNED",passed:!!latest?.escalationOwner,actual:latest?.escalationOwner||"missing"},
      {id:"DEPLOYMENT_OWNER_ASSIGNED",passed:!!latest?.deploymentOwner,actual:latest?.deploymentOwner||"missing"},
      {id:"SUPPORT_RUNBOOK_RECORDED",passed:!!latest?.supportRunbook,actual:latest?.supportRunbook?"recorded":"missing"},
      {id:"INCIDENT_RUNBOOK_RECORDED",passed:!!latest?.incidentRunbook,actual:latest?.incidentRunbook?"recorded":"missing"},
      {id:"RECOVERY_RUNBOOK_RECORDED",passed:!!latest?.recoveryRunbook,actual:latest?.recoveryRunbook?"recorded":"missing"},
      {id:"BUSINESS_HOURS_AND_ON_CALL_DEFINED",passed:!!latest?.supportCoverage,actual:latest?.supportCoverage||"missing"},
      {id:"NO_CRITICAL_ACTIVE_INCIDENTS",passed:criticalIncidents.length===0,actual:`${criticalIncidents.length} critical incident(s)`},
      {id:"RECOVERY_REVIEWS_CURRENT",passed:openRecovery.length===0,actual:`${openRecovery.length} recovery review(s) open`},
      {id:"PRODUCTION_HEALTH_VISIBLE",passed:health.status!==undefined,actual:health.status},
      {id:"HUMAN_SUPPORT_READINESS_ACCEPTED",passed:latest?.decision==="READY",actual:latest?.decision||"not reviewed"}
    ];
    const ready=checks.every(x=>x.passed);
    return {
      version:"99.50.0",gate:"COMMERCIAL_OPERATIONS_AND_SUPPORT_READINESS",generatedAt:this.now(),
      ready,status:ready?"COMMERCIAL_OPERATIONS_SUPPORT_READY":"COMMERCIAL_OPERATIONS_SUPPORT_PENDING",
      checks,latestReadiness:latest,
      operatingModel:{
        supportOwner:latest?.supportOwner||null,
        escalationOwner:latest?.escalationOwner||null,
        deploymentOwner:latest?.deploymentOwner||null,
        supportCoverage:latest?.supportCoverage||null,
        activeIncidentCommands:(incidents.activeCommands||[]).length,
        openRecoveryReviews:openRecovery.length,
        productionHealth:health.status
      },
      policy:{
        namedSupportOwnerRequired:true,namedEscalationOwnerRequired:true,namedDeploymentOwnerRequired:true,
        supportRunbookRequired:true,incidentRunbookRequired:true,recoveryRunbookRequired:true,
        humanSupportReadinessAcceptanceRequired:true,criticalIncidentBlocksReadiness:true,
        openRecoveryReviewBlocksReadiness:true,noAutomaticIncidentClosure:true,noAutomaticSupportAction:true,
        noAutomaticCommercialRelease:true,autonomousProductionChanges:false
      },
      nextGate:"FINAL_GO_NO_GO_AND_V100_RELEASE_AUTHORIZATION"
    };
  }
  async record(org,allowed,input,actor){
    const validation=await this.endToEndValidationService.snapshot(org,allowed);
    if(!validation.validated)throw new Error("Release candidate end-to-end validation must be clear before commercial operations readiness.");
    const fields=["supportOwner","escalationOwner","deploymentOwner","supportRunbook","incidentRunbook","recoveryRunbook","supportCoverage"];
    for(const k of fields)if(!String(input[k]||"").trim())throw new Error(`${k} is required.`);
    const decision=String(input.decision||"").toUpperCase();
    if(!["READY","HOLD"].includes(decision))throw new Error("decision must be READY or HOLD.");
    const rec={
      id:`cosr_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId:org,decision,
      supportOwner:String(input.supportOwner).trim().slice(0,200),
      escalationOwner:String(input.escalationOwner).trim().slice(0,200),
      deploymentOwner:String(input.deploymentOwner).trim().slice(0,200),
      supportRunbook:String(input.supportRunbook).trim().slice(0,5000),
      incidentRunbook:String(input.incidentRunbook).trim().slice(0,5000),
      recoveryRunbook:String(input.recoveryRunbook).trim().slice(0,5000),
      supportCoverage:String(input.supportCoverage).trim().slice(0,2000),
      notes:String(input.notes||"").trim().slice(0,5000)||null,
      createdAt:this.now(),createdBy:actor,commercialReleaseAuthorized:false
    };
    await this.database.mutate(db=>{db.commercialOperationsSupportReadiness||=[];db.commercialOperationsSupportReadiness.push(rec);return rec;});
    await this.auditService.record({organizationId:org,actor,action:`Commercial operations/support readiness ${decision}: ${rec.id}`,category:"commercial_operations_support_readiness"});
    this.realtimeHub.publish("commercial:operations-support-readiness",{organizationId:org,id:rec.id,decision});return rec;
  }
}
module.exports=CommercialOperationsSupportReadinessService;
