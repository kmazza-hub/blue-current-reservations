"use strict";
class PilotValueProofOperatorAcceptanceService {
  constructor(database,auditService,realtimeHub,outcomeMeasurementService){
    Object.assign(this,{database,auditService,realtimeHub,outcomeMeasurementService});
  }
  now(){return new Date().toISOString();}
  async acceptances(org){
    const db=await this.database.read();
    return (db.pilotOperatorAcceptances||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  }
  async snapshot(org,allowed){
    const [measurement,acceptances]=await Promise.all([this.outcomeMeasurementService.snapshot(org,allowed),this.acceptances(org)]);
    const latest=acceptances[0]||null,lens=measurement.outcomeLens||{},metrics=measurement.metricSeries||[];
    const checks=[
      {id:"OUTCOME_MEASUREMENT_READY",passed:measurement.measurementReady===true,actual:measurement.status},
      {id:"OPERATOR_ACCEPTANCE_RECORDED",passed:!!latest,actual:latest?.decision||"missing"},
      {id:"OPERATOR_VALUE_ACCEPTED",passed:latest?.decision==="ACCEPTED",actual:latest?.decision||"missing"},
      {id:"OPERATOR_FRICTION_REVIEWED",passed:latest?.frictionReviewed===true,actual:String(latest?.frictionReviewed===true)},
      {id:"GUEST_IMPACT_REVIEWED",passed:latest?.guestImpactReviewed===true,actual:String(latest?.guestImpactReviewed===true)},
      {id:"WORKFLOW_IMPACT_REVIEWED",passed:latest?.workflowImpactReviewed===true,actual:String(latest?.workflowImpactReviewed===true)},
      {id:"RELIABILITY_CONFIDENCE_RECORDED",passed:["HIGH","MEDIUM","LOW"].includes(latest?.reliabilityConfidence),actual:latest?.reliabilityConfidence||"missing"},
      {id:"MEASURABLE_VALUE_EVIDENCE",passed:metrics.length>0,actual:`${metrics.length} metric series`}
    ];
    const proven=checks.every(x=>x.passed);
    return {version:"97.75.0",gate:"PILOT_VALUE_PROOF_AND_OPERATOR_ACCEPTANCE",generatedAt:this.now(),
      valueProofReady:proven,status:proven?"PILOT_VALUE_ACCEPTED":"PILOT_VALUE_PROOF_PENDING",
      checks,latestAcceptance:latest,
      valueEvidence:{metricSeries:metrics,operatorFrictionObservations:lens.operatorFrictionCount||0,guestImpactObservations:lens.guestImpactCount||0,workflowPerformanceObservations:lens.workflowPerformanceCount||0,operationalOutcomeObservations:lens.operationalOutcomeCount||0,incidentObservations:lens.incidentCount||0,recoveryObservations:lens.recoveryCount||0},
      policy:{operatorAcceptanceHumanRecorded:true,valueNarrativeHumanAuthored:true,reliabilityConfidenceHumanRated:true,measuredTrendIsEvidenceNotCausation:true,noAutomaticValueClaim:true,noAutomaticExpansion:true,noAutomaticCommercialization:true,autonomousProductionChanges:false},
      nextGate:"PILOT_LEARNING_TO_PRODUCT_DECISION_CONTROL"};
  }
  async record(org,allowed,input,actor){
    const measurement=await this.outcomeMeasurementService.snapshot(org,allowed);
    if(!measurement.measurementReady)throw new Error("Pilot evidence quality and outcome measurement must be ready before operator acceptance.");
    const decision=String(input.decision||"").toUpperCase();
    if(!["ACCEPTED","HOLD","REJECTED"].includes(decision))throw new Error("decision must be ACCEPTED, HOLD, or REJECTED.");
    const confidence=String(input.reliabilityConfidence||"").toUpperCase();
    if(!["HIGH","MEDIUM","LOW"].includes(confidence))throw new Error("reliabilityConfidence must be HIGH, MEDIUM, or LOW.");
    const valueNarrative=String(input.valueNarrative||"").trim();
    if(!valueNarrative)throw new Error("valueNarrative is required.");
    for(const k of["frictionReviewed","guestImpactReviewed","workflowImpactReviewed"])if(input[k]!==true)throw new Error(`${k} must be explicitly acknowledged.`);
    const rec={id:`poa_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId:org,decision,reliabilityConfidence:confidence,valueNarrative:valueNarrative.slice(0,6000),frictionReviewed:true,guestImpactReviewed:true,workflowImpactReviewed:true,createdAt:this.now(),createdBy:actor,commercializationAuthorized:false,expansionAuthorized:false};
    await this.database.mutate(db=>{db.pilotOperatorAcceptances||=[];db.pilotOperatorAcceptances.push(rec);return rec;});
    await this.auditService.record({organizationId:org,actor,action:`Pilot operator value decision ${decision}: ${rec.id}`,category:"pilot_operator_acceptance"});
    this.realtimeHub.publish("pilot:operator-acceptance",{organizationId:org,id:rec.id,decision,reliabilityConfidence:confidence});return rec;
  }
}
module.exports=PilotValueProofOperatorAcceptanceService;
