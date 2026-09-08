"use strict";

class V55DecisionValueCertificationService {
  constructor(database,auditService,realtimeHub,restaurantIntelligenceDecisionSupportService,profitabilityInterventionAccountabilityService){
    Object.assign(this,{database,auditService,realtimeHub,restaurantIntelligenceDecisionSupportService,profitabilityInterventionAccountabilityService});
  }
  now(){return new Date().toISOString();}
  async reviews(org){
    const db=await this.database.read();
    return (db.v55DecisionValueReviews||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.reviewedAt)-new Date(a.reviewedAt));
  }
  async certifications(org){
    const db=await this.database.read();
    return (db.v55DecisionValueCertifications||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.certifiedAt)-new Date(a.certifiedAt));
  }
  async snapshot(org,allowed){
    const [intelligence,value,reviews,certs]=await Promise.all([
      this.restaurantIntelligenceDecisionSupportService.snapshot(org,allowed),
      this.profitabilityInterventionAccountabilityService.snapshot(org,allowed),
      this.reviews(org),this.certifications(org)
    ]);
    const review=reviews[0]||null,cert=certs[0]||null;
    const intelligenceReady=(intelligence.locations||[]).length>0&&(intelligence.locations||[]).every(x=>x.intelligenceReady||x.certification?.decision==="READY");
    const valueReady=(value.locations||[]).length>0&&(value.locations||[]).every(x=>x.valueReady||x.certification?.decision==="READY");
    const checks=[
      {id:"RESTAURANT_INTELLIGENCE",passed:intelligenceReady,actual:intelligence.status},
      {id:"PROFITABILITY_ACCOUNTABILITY",passed:valueReady,actual:value.status},
      {id:"SIGNAL_TRUST",passed:review?.signalTrust==="PASS",actual:review?.signalTrust||"not reviewed"},
      {id:"ACTIONABILITY",passed:review?.actionability==="PASS",actual:review?.actionability||"not reviewed"},
      {id:"VALUE_TRACEABILITY",passed:review?.valueTraceability==="PASS",actual:review?.valueTraceability||"not reviewed"},
      {id:"MODELED_VALUE_DISCLOSURE",passed:review?.modeledValueDisclosure==="PASS",actual:review?.modeledValueDisclosure||"not reviewed"},
      {id:"OPERATOR_ACCEPTANCE",passed:!!review?.operatorAcceptance,actual:review?.operatorAcceptance||"not reviewed"},
      {id:"MANAGER_ACCEPTANCE",passed:!!review?.managerAcceptance,actual:review?.managerAcceptance||"not reviewed"},
      {id:"EXECUTIVE_REPORTING",passed:review?.executiveReporting==="PASS",actual:review?.executiveReporting||"not reviewed"},
      {id:"V56_ENTRY",passed:review?.v56Entry==="APPROVED",actual:review?.v56Entry||"not reviewed"},
      {id:"HUMAN_V55_CERTIFICATION",passed:!!cert,actual:cert?.status||"not certified"}
    ];
    const closureReady=checks.slice(0,-1).every(x=>x.passed);
    return {
      version:"56.0.0",generatedAt:this.now(),
      status:cert?"v55-decision-value-certified":review?"v55-decision-value-in-review":"v55-decision-value-certification-required",
      headline:`V55 intelligence/profitability closure ${closureReady?"READY":"OPEN"} · ${checks.filter(x=>x.passed).length}/${checks.length} gates pass · $${Number(value.portfolio?.modeledRealizedValueDollars||0).toLocaleString()} modeled realized value.`,
      checks,closureReady,review,certification:cert,
      portfolio:{
        modeledCurrentOpportunityDollars:Number(value.portfolio?.modeledCurrentOpportunityDollars||0),
        modeledBaselineDollars:Number(value.portfolio?.modeledBaselineDollars||0),
        modeledRealizedValueDollars:Number(value.portfolio?.modeledRealizedValueDollars||0),
        openInterventions:Number(value.portfolio?.openInterventions||0),
        measuredInterventions:Number(value.portfolio?.measuredInterventions||0)
      },
      linked:{restaurantIntelligence:intelligence.status,profitabilityAccountability:value.status},
      policy:{
        modeledValuesAreDecisionSupportNotGAAP:true,
        signalTrustRequired:true,
        actionabilityRequired:true,
        valueTraceabilityRequired:true,
        modeledValueDisclosureRequired:true,
        operatorAcceptanceRequired:true,
        managerAcceptanceRequired:true,
        executiveReportingRequired:true,
        humanV55CertificationRequired:true,
        certificationDoesNotChangePricing:true,
        certificationDoesNotChangeStaffing:true,
        certificationDoesNotChangeScheduling:true,
        certificationDoesNotExecuteRestaurantActions:true,
        autonomousProductionChanges:false
      }
    };
  }
  async review(org,allowed,input,actor){
    for(const k of ["signalTrust","actionability","valueTraceability","modeledValueDisclosure","executiveReporting"]){
      if(!["PASS","FAIL"].includes(String(input[k]||"").toUpperCase()))throw new Error(`${k} must be PASS or FAIL.`);
    }
    for(const k of ["operatorAcceptance","managerAcceptance"]){
      if(!String(input[k]||"").trim())throw new Error(`${k} is required.`);
    }
    const v56Entry=String(input.v56Entry||"").toUpperCase();
    if(!["APPROVED","HOLD"].includes(v56Entry))throw new Error("v56Entry must be APPROVED or HOLD.");
    const record={
      id:`v55dv_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      organizationId:org,reviewedAt:this.now(),reviewedBy:actor,
      signalTrust:String(input.signalTrust).toUpperCase(),
      actionability:String(input.actionability).toUpperCase(),
      valueTraceability:String(input.valueTraceability).toUpperCase(),
      modeledValueDisclosure:String(input.modeledValueDisclosure).toUpperCase(),
      operatorAcceptance:String(input.operatorAcceptance).trim().slice(0,3500),
      managerAcceptance:String(input.managerAcceptance).trim().slice(0,3500),
      executiveReporting:String(input.executiveReporting).toUpperCase(),
      v56Entry,note:String(input.note||"").trim().slice(0,2500),
      pricingChanged:false,staffingChanged:false,scheduleChanged:false,restaurantActionExecuted:false
    };
    await this.database.mutate(db=>{db.v55DecisionValueReviews||=[];db.v55DecisionValueReviews.push(record);return record;});
    await this.auditService.record({organizationId:org,actor,action:"V55 intelligence/profitability closure review recorded",category:"v55_decision_value"});
    this.realtimeHub.publish("v55-decision-value:reviewed",{organizationId:org,id:record.id});
    return record;
  }
  async certify(org,allowed,input,actor){
    const state=await this.snapshot(org,allowed);
    if(!state.closureReady)throw new Error("All V55 decision-value closure gates must pass before certification.");
    const evidence=String(input.evidence||"").trim(),acceptance=String(input.acceptance||"").trim();
    if(!evidence||!acceptance)throw new Error("Certification evidence and executive acceptance are required.");
    const record={
      id:`v55dvc_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      organizationId:org,status:"V55_DECISION_VALUE_CERTIFIED",
      certifiedAt:this.now(),certifiedBy:actor,
      evidence:evidence.slice(0,4500),acceptance:acceptance.slice(0,3000),
      gateSnapshot:state.checks.slice(0,-1),
      portfolioSnapshot:state.portfolio,
      pricingChangedByCertification:false,staffingChangedByCertification:false,
      scheduleChangedByCertification:false,restaurantActionExecutedByCertification:false,
      autonomousProductionChanges:false
    };
    await this.database.mutate(db=>{db.v55DecisionValueCertifications||=[];db.v55DecisionValueCertifications.push(record);return record;});
    await this.auditService.record({organizationId:org,actor,action:"V55 intelligence and profitability certified; V56 entry approved",category:"v55_decision_value"});
    this.realtimeHub.publish("v55-decision-value:certified",{organizationId:org,id:record.id});
    return record;
  }
}
module.exports=V55DecisionValueCertificationService;
