"use strict";

class ProfitabilityInterventionAccountabilityService {
  constructor(database,auditService,realtimeHub,restaurantIntelligenceDecisionSupportService){
    Object.assign(this,{database,auditService,realtimeHub,restaurantIntelligenceDecisionSupportService});
  }
  now(){return new Date().toISOString();}
  async interventions(org){
    const db=await this.database.read();
    return (db.profitabilityInterventions||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  }
  async outcomes(org){
    const db=await this.database.read();
    return (db.profitabilityInterventionOutcomes||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.measuredAt)-new Date(a.measuredAt));
  }
  async certifications(org){
    const db=await this.database.read();
    return (db.profitabilityInterventionCertifications||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.certifiedAt)-new Date(a.certifiedAt));
  }
  clamp(v,min,max){return Math.max(min,Math.min(max,Number(v)||0));}
  async snapshot(org,allowed){
    const [intelligence,interventions,outcomes,certs]=await Promise.all([
      this.restaurantIntelligenceDecisionSupportService.snapshot(org,allowed),
      this.interventions(org),this.outcomes(org),this.certifications(org)
    ]);

    const locations=(intelligence.locations||[]).map(loc=>{
      const actions=interventions.filter(x=>x.locationId===loc.locationId);
      const measured=outcomes.filter(x=>x.locationId===loc.locationId);
      const cert=certs.find(x=>x.locationId===loc.locationId)||null;

      const actionRows=actions.map(action=>{
        const outcome=measured.find(x=>x.interventionId===action.id)||null;
        const before=Number(action.baselineOpportunityDollars||0);
        const after=outcome ? Number(outcome.remainingOpportunityDollars||0) : null;
        const realized=outcome ? Math.max(0,before-after) : 0;
        const realizationRate=before>0&&outcome ? Math.round(realized/before*100) : 0;
        return {...action,outcome,realizedValueDollars:realized,realizationRate};
      });

      const completed=actionRows.filter(x=>x.outcome);
      const open=actionRows.filter(x=>!x.outcome);
      const realizedValue=completed.reduce((n,x)=>n+x.realizedValueDollars,0);
      const modeledBaseline=actionRows.reduce((n,x)=>n+Number(x.baselineOpportunityDollars||0),0);
      const averageRealization=completed.length?Math.round(completed.reduce((n,x)=>n+x.realizationRate,0)/completed.length):0;
      const latestTrend=measured.slice(0,6).map(x=>({
        measuredAt:x.measuredAt,
        interventionId:x.interventionId,
        baselineOpportunityDollars:x.baselineOpportunityDollars,
        remainingOpportunityDollars:x.remainingOpportunityDollars,
        realizedValueDollars:Math.max(0,Number(x.baselineOpportunityDollars||0)-Number(x.remainingOpportunityDollars||0)),
        result:x.result
      }));

      const checks=[
        {id:"INTELLIGENCE_READY",passed:loc.intelligenceReady||loc.certification?.decision==="READY",actual:loc.state},
        {id:"INTERVENTION_ACCOUNTABILITY",passed:actions.length>0,actual:`${actions.length} intervention(s)`},
        {id:"OWNER_ASSIGNED",passed:actions.length>0&&actions.every(x=>!!x.owner),actual:`${actions.filter(x=>x.owner).length}/${actions.length} owned`},
        {id:"TARGET_DATE_DEFINED",passed:actions.length>0&&actions.every(x=>!!x.targetDate),actual:`${actions.filter(x=>x.targetDate).length}/${actions.length} dated`},
        {id:"BASELINE_CAPTURED",passed:actions.length>0&&actions.every(x=>Number.isFinite(Number(x.baselineOpportunityDollars))),actual:`$${modeledBaseline} modeled baseline`},
        {id:"OUTCOME_MEASUREMENT",passed:completed.length>0,actual:`${completed.length}/${actions.length} measured`},
        {id:"VALUE_REALIZATION",passed:completed.length>0&&realizedValue>=0,actual:`$${realizedValue} modeled realized value`},
        {id:"TREND_VISIBILITY",passed:latestTrend.length>0,actual:`${latestTrend.length} trend point(s)`},
        {id:"DECISION_ACCOUNTABILITY",passed:completed.length>0&&completed.every(x=>x.outcome?.decisionAccountability==="PASS"),actual:`${completed.filter(x=>x.outcome?.decisionAccountability==="PASS").length}/${completed.length} accountable`},
        {id:"OUTCOME_EVIDENCE",passed:completed.length>0&&completed.every(x=>!!x.outcome?.evidence),actual:`${completed.filter(x=>x.outcome?.evidence).length}/${completed.length} evidenced`},
        {id:"HUMAN_VALUE_CERTIFICATION",passed:!!cert,actual:cert?.decision||"not certified"}
      ];

      return {
        locationId:loc.locationId,locationName:loc.locationName,
        currentModeledOpportunityDollars:loc.modeledOpportunityDollars,
        signals:loc.signals,
        interventions:actionRows,
        openInterventions:open.length,measuredInterventions:completed.length,
        modeledBaselineDollars:modeledBaseline,modeledRealizedValueDollars:realizedValue,
        averageRealizationRate:averageRealization,trend:latestTrend,
        certification:cert,checks,
        passed:checks.filter(x=>x.passed).length,total:checks.length,
        valueReady:checks.slice(0,-1).every(x=>x.passed),
        state:cert?.decision==="READY"?"VALUE_ACCOUNTABILITY_READY":
              cert?.decision==="REVISE"?"VALUE_ACCOUNTABILITY_REVISE":
              cert?.decision==="HOLD"?"VALUE_ACCOUNTABILITY_HOLD":
              completed.length?"VALUE_MEASURED":actions.length?"INTERVENTION_ACTIVE":"INTERVENTION_REQUIRED"
      };
    });

    const portfolio={
      locations:locations.length,
      modeledCurrentOpportunityDollars:locations.reduce((n,x)=>n+Number(x.currentModeledOpportunityDollars||0),0),
      modeledBaselineDollars:locations.reduce((n,x)=>n+x.modeledBaselineDollars,0),
      modeledRealizedValueDollars:locations.reduce((n,x)=>n+x.modeledRealizedValueDollars,0),
      openInterventions:locations.reduce((n,x)=>n+x.openInterventions,0),
      measuredInterventions:locations.reduce((n,x)=>n+x.measuredInterventions,0),
      readyLocations:locations.filter(x=>x.valueReady).length
    };

    return {
      version:"55.75.0",generatedAt:this.now(),
      status:locations.some(x=>x.certification?.decision==="READY")?"profitability-accountability-ready":
             locations.some(x=>x.measuredInterventions>0)?"profitability-accountability-in-review":
             "profitability-intervention-required",
      headline:`${portfolio.readyLocations}/${portfolio.locations} location(s) satisfy profitability-accountability gates; $${portfolio.modeledRealizedValueDollars.toLocaleString()} modeled value realized from measured interventions.`,
      portfolio,locations,
      policy:{
        modeledValuesAreDecisionSupportNotGAAP:true,
        humanInterventionRequired:true,
        ownerAndTargetDateRequired:true,
        beforeAfterMeasurementRequired:true,
        outcomeEvidenceRequired:true,
        decisionAccountabilityRequired:true,
        humanReadyReviseHoldRequired:true,
        noAutomaticPricingChange:true,
        noAutomaticStaffingChange:true,
        noAutomaticScheduleChange:true,
        noAutomaticSeatingChange:true,
        noAutomaticRestaurantAction:true,
        autonomousProductionChanges:false
      }
    };
  }

  async createIntervention(org,allowed,locationId,input,actor){
    const intelligence=await this.restaurantIntelligenceDecisionSupportService.snapshot(org,allowed);
    const loc=(intelligence.locations||[]).find(x=>x.locationId===locationId);
    if(!loc)throw new Error("Location not found.");
    const signalId=String(input.signalId||"").trim();
    const signal=(loc.signals||[]).find(x=>x.id===signalId);
    if(!signal)throw new Error("A current prioritized intelligence signal is required.");
    const owner=String(input.owner||"").trim(),targetDate=String(input.targetDate||"").trim();
    const intervention=String(input.intervention||"").trim(),evidence=String(input.evidence||"").trim();
    if(!owner||!targetDate||!intervention||!evidence)throw new Error("Owner, target date, intervention, and evidence are required.");
    const record={
      id:`pia_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      organizationId:org,locationId,locationName:loc.locationName,
      signalId:signal.id,signalTitle:signal.title,signalCategory:signal.category,
      baselineOpportunityDollars:Number(signal.impactDollars||0),
      baselineScore:Number(signal.score||0),
      owner:owner.slice(0,240),targetDate:targetDate.slice(0,120),
      intervention:intervention.slice(0,3500),evidence:evidence.slice(0,3500),
      createdAt:this.now(),createdBy:actor,status:"ACTIVE",
      pricingChangedAutomatically:false,staffingChangedAutomatically:false,
      scheduleChangedAutomatically:false,seatingChangedAutomatically:false,
      restaurantActionExecutedAutomatically:false
    };
    await this.database.mutate(db=>{db.profitabilityInterventions||=[];db.profitabilityInterventions.push(record);return record;});
    await this.auditService.record({organizationId:org,actor,action:`Profitability intervention recorded for ${locationId}: ${signal.title}`,category:"profitability_accountability"});
    this.realtimeHub.publish("profitability-accountability:intervention-created",{organizationId:org,locationId,id:record.id});
    return record;
  }

  async measureOutcome(org,allowed,interventionId,input,actor){
    const interventions=await this.interventions(org);
    const intervention=interventions.find(x=>x.id===interventionId);
    if(!intervention)throw new Error("Intervention not found.");
    if(!(allowed.includes("*")||allowed.includes(intervention.locationId)))throw new Error("Location is outside your authorized scope.");
    const remaining=Math.max(0,Number(input.remainingOpportunityDollars));
    if(!Number.isFinite(remaining))throw new Error("remainingOpportunityDollars is required.");
    const result=String(input.result||"").toUpperCase();
    if(!["IMPROVED","UNCHANGED","WORSE"].includes(result))throw new Error("Result must be IMPROVED, UNCHANGED, or WORSE.");
    const decisionAccountability=String(input.decisionAccountability||"").toUpperCase();
    if(!["PASS","FAIL"].includes(decisionAccountability))throw new Error("decisionAccountability must be PASS or FAIL.");
    const evidence=String(input.evidence||"").trim(),lessons=String(input.lessons||"").trim();
    if(!evidence||!lessons)throw new Error("Outcome evidence and lessons are required.");
    const record={
      id:`pio_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      organizationId:org,locationId:intervention.locationId,interventionId,
      baselineOpportunityDollars:Number(intervention.baselineOpportunityDollars||0),
      remainingOpportunityDollars:remaining,result,decisionAccountability,
      evidence:evidence.slice(0,4000),lessons:lessons.slice(0,3500),
      measuredAt:this.now(),measuredBy:actor,
      pricingChangedAutomatically:false,staffingChangedAutomatically:false,
      restaurantActionExecutedAutomatically:false
    };
    await this.database.mutate(db=>{db.profitabilityInterventionOutcomes||=[];db.profitabilityInterventionOutcomes.push(record);const x=(db.profitabilityInterventions||[]).find(x=>x.id===interventionId);if(x)x.status="MEASURED";return record;});
    await this.auditService.record({organizationId:org,actor,action:`Profitability intervention outcome measured: ${result}`,category:"profitability_accountability"});
    this.realtimeHub.publish("profitability-accountability:outcome-measured",{organizationId:org,locationId:record.locationId,interventionId});
    return record;
  }

  async certify(org,allowed,locationId,input,actor){
    const state=await this.snapshot(org,allowed),loc=state.locations.find(x=>x.locationId===locationId);
    if(!loc)throw new Error("Location not found.");
    const decision=String(input.decision||"").toUpperCase(),evidence=String(input.evidence||"").trim(),reason=String(input.reason||"").trim();
    if(!["READY","REVISE","HOLD"].includes(decision))throw new Error("Decision must be READY, REVISE, or HOLD.");
    if(!evidence)throw new Error("Certification evidence is required.");
    if(decision==="READY"&&!loc.valueReady&&!reason)throw new Error("READY with open gates requires an executive override reason.");
    if(["REVISE","HOLD"].includes(decision)&&!reason)throw new Error(`${decision} requires a reason.`);
    const record={
      id:`piac_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      organizationId:org,locationId,decision,status:"PROFITABILITY_ACCOUNTABILITY_CERTIFIED",
      certifiedAt:this.now(),certifiedBy:actor,evidence:evidence.slice(0,4000),reason:reason.slice(0,2200),
      gateSnapshot:loc.checks,
      modeledRealizedValueDollars:loc.modeledRealizedValueDollars,
      pricingChangedByCertification:false,staffingChangedByCertification:false,
      restaurantActionExecutedByCertification:false,autonomousProductionChanges:false
    };
    await this.database.mutate(db=>{db.profitabilityInterventionCertifications||=[];db.profitabilityInterventionCertifications.push(record);return record;});
    await this.auditService.record({organizationId:org,actor,action:`Profitability accountability ${decision} certified for ${locationId}`,category:"profitability_accountability"});
    return record;
  }
}
module.exports=ProfitabilityInterventionAccountabilityService;
