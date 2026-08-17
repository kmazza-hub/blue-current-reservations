"use strict";
class LivePilotFieldEvidenceService {
  constructor(database,auditService,realtimeHub,releaseDisciplineService){
    Object.assign(this,{database,auditService,realtimeHub,releaseDisciplineService});
  }
  now(){return new Date().toISOString();}
  async evidence(org){
    const db=await this.database.read();
    return (db.livePilotFieldEvidence||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.observedAt)-new Date(a.observedAt));
  }
  async snapshot(org,allowed){
    const [release,items]=await Promise.all([this.releaseDisciplineService.snapshot(org,allowed),this.evidence(org)]);
    const serviceNights=[...new Set(items.map(x=>x.serviceNightId))];
    const guestImpact=items.filter(x=>x.category==="GUEST_IMPACT");
    const operatorFriction=items.filter(x=>x.category==="OPERATOR_FRICTION");
    const workflow=items.filter(x=>x.category==="WORKFLOW_PERFORMANCE");
    const interventions=items.filter(x=>x.category==="SYSTEM_INTERVENTION");
    const incidents=items.filter(x=>x.category==="INCIDENT");
    const recovery=items.filter(x=>x.category==="RECOVERY");
    const outcomes=items.filter(x=>x.category==="OPERATIONAL_OUTCOME");
    const checks=[
      {id:"CONTROLLED_RELEASE_AUTHORIZED",passed:release.releaseAuthorized===true,actual:release.status},
      {id:"SERVICE_NIGHT_IDENTITY_AVAILABLE",passed:serviceNights.length>0,actual:`${serviceNights.length} service night(s)`},
      {id:"OPERATOR_FRICTION_CAPTURED",passed:operatorFriction.length>0,actual:`${operatorFriction.length} observation(s)`},
      {id:"GUEST_IMPACT_CAPTURED",passed:guestImpact.length>0,actual:`${guestImpact.length} observation(s)`},
      {id:"WORKFLOW_PERFORMANCE_CAPTURED",passed:workflow.length>0,actual:`${workflow.length} observation(s)`},
      {id:"OPERATIONAL_OUTCOME_CAPTURED",passed:outcomes.length>0,actual:`${outcomes.length} observation(s)`}
    ];
    return {
      version:"97.25.0",gate:"LIVE_PILOT_EXECUTION_AND_FIELD_EVIDENCE",generatedAt:this.now(),
      fieldEvidenceReady:checks.every(x=>x.passed),status:checks.every(x=>x.passed)?"FIELD_EVIDENCE_BASELINE_ESTABLISHED":"FIELD_EVIDENCE_ACCUMULATING",
      checks,summary:{total:items.length,serviceNights:serviceNights.length,operatorFriction:operatorFriction.length,guestImpact:guestImpact.length,workflowPerformance:workflow.length,systemInterventions:interventions.length,incidents:incidents.length,recovery:recovery.length,operationalOutcomes:outcomes.length},
      evidence:items,
      requiredCategories:["OPERATOR_FRICTION","GUEST_IMPACT","WORKFLOW_PERFORMANCE","SYSTEM_INTERVENTION","INCIDENT","RECOVERY","OPERATIONAL_OUTCOME"],
      policy:{fieldEvidenceHumanObserved:true,serviceNightIdentityRequired:true,locationIdentityRequired:true,evidenceTimestampRequired:true,productionMutationFromEvidence:false,noAutomaticProductChange:true,noAutomaticReleaseDecision:true,autonomousProductionChanges:false},
      nextGate:"PILOT_EVIDENCE_QUALITY_AND_OUTCOME_MEASUREMENT"
    };
  }
  async record(org,allowed,input,actor){
    const release=await this.releaseDisciplineService.snapshot(org,allowed);
    if(!release.releaseAuthorized)throw new Error("Controlled release must be authorized before live pilot field evidence is recorded.");
    const category=String(input.category||"").toUpperCase();
    const allowedCategories=["OPERATOR_FRICTION","GUEST_IMPACT","WORKFLOW_PERFORMANCE","SYSTEM_INTERVENTION","INCIDENT","RECOVERY","OPERATIONAL_OUTCOME"];
    if(!allowedCategories.includes(category))throw new Error("Unsupported field evidence category.");
    for(const k of["serviceNightId","locationId","observation"])if(!String(input[k]||"").trim())throw new Error(`${k} is required.`);
    if(Array.isArray(allowed)&&allowed.length&&!allowed.includes(input.locationId))throw new Error("Location is outside the operator's authorized scope.");
    const rec={id:`pfe_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId:org,serviceNightId:String(input.serviceNightId).trim().slice(0,160),locationId:String(input.locationId).trim().slice(0,160),category,observation:String(input.observation).trim().slice(0,6000),metricName:String(input.metricName||"").trim().slice(0,160)||null,metricValue:Number.isFinite(Number(input.metricValue))?Number(input.metricValue):null,metricUnit:String(input.metricUnit||"").trim().slice(0,80)||null,guestImpact:String(input.guestImpact||"").trim().slice(0,2000)||null,operatorImpact:String(input.operatorImpact||"").trim().slice(0,2000)||null,observedAt:input.observedAt||this.now(),createdAt:this.now(),createdBy:actor,verified:false};
    await this.database.mutate(db=>{db.livePilotFieldEvidence||=[];db.livePilotFieldEvidence.push(rec);return rec;});
    await this.auditService.record({organizationId:org,actor,action:`Live pilot evidence recorded ${rec.id}: ${category}`,category:"live_pilot_field_evidence"});
    this.realtimeHub.publish("pilot:field-evidence",{organizationId:org,id:rec.id,serviceNightId:rec.serviceNightId,category});return rec;
  }
}
module.exports=LivePilotFieldEvidenceService;
