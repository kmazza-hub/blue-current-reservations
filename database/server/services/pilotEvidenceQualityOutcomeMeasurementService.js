"use strict";
class PilotEvidenceQualityOutcomeMeasurementService {
  constructor(fieldEvidenceService){this.fieldEvidenceService=fieldEvidenceService;}
  numeric(items){return items.filter(x=>Number.isFinite(Number(x.metricValue))&&x.metricName);}
  group(items,key){return items.reduce((a,x)=>{const k=x[key]||"UNSPECIFIED";(a[k]||=[]).push(x);return a;},{});}
  avg(items){return items.length?items.reduce((n,x)=>n+Number(x.metricValue),0)/items.length:null;}
  async snapshot(org,allowed){
    const field=await this.fieldEvidenceService.snapshot(org,allowed),items=field.evidence||[],numeric=this.numeric(items);
    const nights=this.group(items,"serviceNightId"),metrics=this.group(numeric,"metricName"),categories=this.group(items,"category");
    const required=["OPERATOR_FRICTION","GUEST_IMPACT","WORKFLOW_PERFORMANCE","OPERATIONAL_OUTCOME"];
    const completeness=items.length?Math.round(items.reduce((n,x)=>n+["serviceNightId","locationId","category","observation","observedAt"].filter(k=>!!x[k]).length,0)/(items.length*5)*100):0;
    const metricSeries=Object.entries(metrics).map(([metricName,rows])=>{
      const ordered=[...rows].sort((a,b)=>new Date(a.observedAt)-new Date(b.observedAt)),first=Number(ordered[0].metricValue),last=Number(ordered[ordered.length-1].metricValue);
      return {metricName,unit:ordered[0].metricUnit||null,samples:ordered.length,baseline:first,current:last,delta:last-first,average:this.avg(ordered)};
    });
    const checks=[
      {id:"FIELD_EVIDENCE_BASELINE",passed:field.fieldEvidenceReady===true,actual:field.status},
      {id:"EVIDENCE_COMPLETENESS_95",passed:completeness>=95,actual:`${completeness}%`},
      {id:"MULTI_SERVICE_NIGHT_EVIDENCE",passed:Object.keys(nights).length>=2,actual:`${Object.keys(nights).length} service night(s)`},
      {id:"CORE_CATEGORIES_REPRESENTED",passed:required.every(x=>(categories[x]||[]).length>0),actual:`${required.filter(x=>(categories[x]||[]).length>0).length}/${required.length}`},
      {id:"MEASURABLE_OUTCOMES_AVAILABLE",passed:metricSeries.length>0,actual:`${metricSeries.length} metric series`},
      {id:"EVIDENCE_VERIFICATION_PRESENT",passed:items.length>0&&items.some(x=>x.verified===true),actual:`${items.filter(x=>x.verified===true).length}/${items.length} verified`}
    ];
    return {version:"97.50.0",gate:"PILOT_EVIDENCE_QUALITY_AND_OUTCOME_MEASUREMENT",generatedAt:new Date().toISOString(),
      measurementReady:checks.every(x=>x.passed),status:checks.every(x=>x.passed)?"OUTCOME_MEASUREMENT_READY":"EVIDENCE_QUALITY_ACCUMULATING",
      checks,quality:{evidenceCompletenessPercent:completeness,totalObservations:items.length,verifiedObservations:items.filter(x=>x.verified===true).length,serviceNights:Object.keys(nights).length,locations:new Set(items.map(x=>x.locationId)).size},
      categoryCounts:Object.fromEntries(Object.entries(categories).map(([k,v])=>[k,v.length])),metricSeries,
      outcomeLens:{operatorFrictionCount:(categories.OPERATOR_FRICTION||[]).length,guestImpactCount:(categories.GUEST_IMPACT||[]).length,workflowPerformanceCount:(categories.WORKFLOW_PERFORMANCE||[]).length,interventionCount:(categories.SYSTEM_INTERVENTION||[]).length,incidentCount:(categories.INCIDENT||[]).length,recoveryCount:(categories.RECOVERY||[]).length,operationalOutcomeCount:(categories.OPERATIONAL_OUTCOME||[]).length},
      policy:{minimumEvidenceCompletenessPercent:95,multipleServiceNightsRequired:true,coreCategoryCoverageRequired:true,humanVerificationRequired:true,metricTrendIsEvidenceNotCausation:true,noAutomaticCommercialClaim:true,noAutomaticProductChange:true,autonomousProductionChanges:false},
      nextGate:"PILOT_VALUE_PROOF_AND_OPERATOR_ACCEPTANCE"};
  }
}
module.exports=PilotEvidenceQualityOutcomeMeasurementService;
