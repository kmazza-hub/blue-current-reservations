"use strict";
class RestaurantIntelligenceDecisionSupportService{
  constructor(database,auditService,realtimeHub,v54OperatorExperienceCertificationService,serviceProfitabilityIntelligenceService,hospitalityPerformanceService,workforceIntelligenceService){
    Object.assign(this,{database,auditService,realtimeHub,v54OperatorExperienceCertificationService,serviceProfitabilityIntelligenceService,hospitalityPerformanceService,workforceIntelligenceService});
  }
  now(){return new Date().toISOString();}
  allowed(id,allowed=[]){return allowed.includes("*")||allowed.includes(id);}
  async reviews(org){const db=await this.database.read();return (db.restaurantIntelligenceDecisionReviews||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.reviewedAt)-new Date(a.reviewedAt));}
  async certifications(org){const db=await this.database.read();return (db.restaurantIntelligenceDecisionCertifications||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.certifiedAt)-new Date(a.certifiedAt));}
  severity(score){return score>=85?"critical":score>=70?"high":score>=50?"medium":"low";}
  signal(id,title,category,impact,why,nextAction,owner,confidence,locationId,metrics={}){
    const impactDollars=Math.max(0,Math.round(Number(impact)||0));
    const score=Math.min(100,Math.round((impactDollars>1000?90:impactDollars>500?78:impactDollars>200?65:impactDollars>50?50:35)*.65+Math.max(0,Math.min(100,Number(confidence)||75))*.35));
    return {id,title,category,impactDollars,score,severity:this.severity(score),why,nextAction,owner,confidence:Number(confidence)||75,locationId,metrics,status:"open"};
  }
  async snapshot(org,allowed){
    const [db,v54,reviews,certs]=await Promise.all([this.database.read(),this.v54OperatorExperienceCertificationService.snapshot(org,allowed),this.reviews(org),this.certifications(org)]);
    const locations=(db.locations||[]).filter(x=>x.organizationId===org&&this.allowed(x.id,allowed));
    const rows=[];
    for(const loc of locations){
      const [profit,performance,workforce]=await Promise.all([
        this.serviceProfitabilityIntelligenceService.snapshot(org,loc.id),
        this.hospitalityPerformanceService.snapshot(org,loc.id),
        this.workforceIntelligenceService.snapshot(org,loc.id)
      ]);
      const review=reviews.find(x=>x.locationId===loc.id)||null,cert=certs.find(x=>x.locationId===loc.id)||null;
      const signals=(profit.constraints||[]).map(x=>this.signal(`profit_${x.id}`,x.label,x.category,x.modeledLeakageDollars,x.why,x.nextAction,x.category==="labor"?"General Manager":x.category==="kitchen"?"Kitchen Manager":"Manager",x.confidence,loc.id,x.metrics));
      for(const x of (performance.opportunities||[]).slice(0,5)){
        if(!signals.some(s=>s.title===x.title))signals.push(this.signal(`perf_${x.id}`,x.title,x.category,x.estimatedImpactDollars,x.why,x.nextAction,x.owner,x.confidence,loc.id,x.metadata));
      }
      signals.sort((a,b)=>b.score-a.score);
      const top=signals.slice(0,5),modeledOpportunity=top.reduce((n,x)=>n+x.impactDollars,0);
      const laborPercent=Number(workforce?.summary?.laborPercent||0),targetLaborPercent=Number(workforce?.summary?.targetLaborPercent||0);
      const checks=[
        {id:"V54_OPERATOR_EXPERIENCE_CERTIFIED",passed:!!v54.certification,actual:v54.status},
        {id:"PROFITABILITY_MODEL",passed:!!profit?.summary,actual:`$${profit?.summary?.modeledLeakageDollars||0} modeled leakage`},
        {id:"PRIORITIZED_SIGNALS",passed:top.length>0,actual:`${top.length} prioritized signal(s)`},
        {id:"LABOR_SIGNAL",passed:Number.isFinite(laborPercent),actual:`${laborPercent}% vs ${targetLaborPercent}% target`},
        {id:"THROUGHPUT_SIGNAL",passed:!!profit?.productivity,actual:`${profit?.productivity?.delayedTickets||0} delayed ticket(s) · ${profit?.productivity?.longWaitParties||0} long wait(s)`},
        {id:"REVENUE_OPPORTUNITY",passed:Number.isFinite(modeledOpportunity),actual:`$${modeledOpportunity} modeled opportunity`},
        {id:"HUMAN_SIGNAL_REVIEW",passed:!!review,actual:review?.reviewedAt||"not reviewed"},
        {id:"ACTIONABILITY",passed:review?.actionability==="PASS",actual:review?.actionability||"not assessed"},
        {id:"TRUST",passed:review?.trust==="PASS",actual:review?.trust||"not assessed"},
        {id:"NOISE_CONTROL",passed:review?.noiseControl==="PASS",actual:review?.noiseControl||"not assessed"},
        {id:"HUMAN_INTELLIGENCE_CERTIFICATION",passed:!!cert,actual:cert?.decision||"not certified"}
      ];
      rows.push({locationId:loc.id,locationName:loc.name||loc.displayName||loc.id,profitability:profit.summary,productivity:profit.productivity,labor:{laborPercent,targetLaborPercent,projectedLabor:workforce?.summary?.projectedLabor||0,salesForecast:workforce?.summary?.salesForecast||0},signals:top,modeledOpportunityDollars:modeledOpportunity,review,certification:cert,checks,passed:checks.filter(x=>x.passed).length,total:checks.length,intelligenceReady:checks.slice(0,-1).every(x=>x.passed),state:cert?.decision==="READY"?"INTELLIGENCE_READY":cert?.decision==="REVISE"?"INTELLIGENCE_REVISE":cert?.decision==="HOLD"?"INTELLIGENCE_HOLD":review?"INTELLIGENCE_REVIEWED":"INTELLIGENCE_REVIEW_REQUIRED"});
    }
    return {version:"55.25.0",generatedAt:this.now(),status:rows.some(x=>x.certification?.decision==="READY")?"restaurant-intelligence-ready":rows.some(x=>x.review)?"restaurant-intelligence-in-review":"restaurant-intelligence-review-required",headline:`${rows.filter(x=>x.intelligenceReady).length}/${rows.length} location(s) satisfy restaurant-intelligence gates; $${rows.reduce((n,x)=>n+x.modeledOpportunityDollars,0).toLocaleString()} modeled prioritized opportunity.`,locations:rows,policy:{modeledProfitabilityNotGAAP:true,humanSignalReviewRequired:true,actionabilityRequired:true,trustRequired:true,noiseControlRequired:true,humanReadyReviseHoldRequired:true,noAutomaticPricingChange:true,noAutomaticStaffingChange:true,noAutomaticSeatingChange:true,noAutomaticGuestCompensation:true,noAutomaticRestaurantAction:true,autonomousProductionChanges:false}};
  }
  async review(org,allowed,locationId,input,actor){
    for(const k of ["actionability","trust","noiseControl"])if(!["PASS","FAIL"].includes(String(input[k]||"").toUpperCase()))throw new Error(`${k} must be PASS or FAIL.`);
    const evidence=String(input.evidence||"").trim();if(!evidence)throw new Error("Human intelligence review evidence is required.");
    const record={id:`rid_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId:org,locationId,reviewedAt:this.now(),reviewedBy:actor,actionability:String(input.actionability).toUpperCase(),trust:String(input.trust).toUpperCase(),noiseControl:String(input.noiseControl).toUpperCase(),evidence:evidence.slice(0,4000),note:String(input.note||"").trim().slice(0,2200),pricingChanged:false,staffingChanged:false,seatingChanged:false,restaurantActionExecuted:false};
    await this.database.mutate(db=>{db.restaurantIntelligenceDecisionReviews||=[];db.restaurantIntelligenceDecisionReviews.push(record);return record;});await this.auditService.record({organizationId:org,actor,action:`Restaurant intelligence review recorded for ${locationId}`,category:"restaurant_intelligence"});return record;
  }
  async certify(org,allowed,locationId,input,actor){
    const state=await this.snapshot(org,allowed),loc=state.locations.find(x=>x.locationId===locationId);if(!loc?.review)throw new Error("Human signal review required.");
    const decision=String(input.decision||"").toUpperCase(),evidence=String(input.evidence||"").trim(),reason=String(input.reason||"").trim();if(!["READY","REVISE","HOLD"].includes(decision))throw new Error("Decision must be READY, REVISE, or HOLD.");if(!evidence)throw new Error("Certification evidence required.");if(decision==="READY"&&!loc.intelligenceReady&&!reason)throw new Error("READY with open gates requires override reason.");if(["REVISE","HOLD"].includes(decision)&&!reason)throw new Error(`${decision} requires reason.`);
    const record={id:`ridc_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId:org,locationId,decision,status:"RESTAURANT_INTELLIGENCE_CERTIFIED",certifiedAt:this.now(),certifiedBy:actor,evidence:evidence.slice(0,4000),reason:reason.slice(0,2200),gateSnapshot:loc.checks,pricingChangedByCertification:false,staffingChangedByCertification:false,seatingChangedByCertification:false,restaurantActionExecutedByCertification:false,autonomousProductionChanges:false};
    await this.database.mutate(db=>{db.restaurantIntelligenceDecisionCertifications||=[];db.restaurantIntelligenceDecisionCertifications.push(record);return record;});return record;
  }
}
module.exports=RestaurantIntelligenceDecisionSupportService;
