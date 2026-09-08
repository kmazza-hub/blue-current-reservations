"use strict";
class CommercialProductFreezeFinalHardeningService {
  constructor(database,auditService,realtimeHub,productDecisionService){
    Object.assign(this,{database,auditService,realtimeHub,productDecisionService});
  }
  now(){return new Date().toISOString();}
  async records(org){
    const db=await this.database.read();
    return (db.commercialProductFreezeRecords||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  }
  async snapshot(org,allowed){
    const [product,records]=await Promise.all([this.productDecisionService.snapshot(org,allowed),this.records(org)]);
    const latest=records[0]||null,exceptions=latest?.exceptions||[];
    const openExceptions=exceptions.filter(x=>x.status!=="CLOSED"),criticalOpen=openExceptions.filter(x=>["HIGH","CRITICAL"].includes(x.risk));
    const checks=[
      {id:"PILOT_LEARNING_CONTROLLED",passed:product.productDecisionReady===true,actual:product.status},
      {id:"FREEZE_BASELINE_RECORDED",passed:!!latest,actual:latest?.baselineId||"missing"},
      {id:"SCOPE_FREEZE_ACKNOWLEDGED",passed:latest?.scopeFrozen===true,actual:String(latest?.scopeFrozen===true)},
      {id:"PERMITTED_CHANGE_CLASSES_DEFINED",passed:Array.isArray(latest?.permittedChangeClasses)&&latest.permittedChangeClasses.length>0,actual:`${latest?.permittedChangeClasses?.length||0} class(es)`},
      {id:"REGRESSION_PROTECTION_REQUIRED",passed:latest?.regressionProtectionRequired===true,actual:String(latest?.regressionProtectionRequired===true)},
      {id:"NO_HIGH_RISK_FREEZE_EXCEPTIONS",passed:criticalOpen.length===0,actual:`${criticalOpen.length} high/critical open exception(s)`},
      {id:"FREEZE_OWNER_ASSIGNED",passed:!!latest?.owner,actual:latest?.owner||"missing"},
      {id:"FINAL_HARDENING_TARGET_DEFINED",passed:!!latest?.hardeningTarget,actual:latest?.hardeningTarget||"missing"}
    ];
    const ready=checks.every(x=>x.passed);
    return {version:"98.25.0",gate:"COMMERCIAL_PRODUCT_FREEZE_AND_FINAL_HARDENING",generatedAt:this.now(),
      freezeReady:ready,status:ready?"COMMERCIAL_PRODUCT_FROZEN":"COMMERCIAL_PRODUCT_FREEZE_PENDING",
      checks,latestFreeze:latest,openExceptions,productDecisionControl:product,
      defaultPermittedChangeClasses:["P0_DEFECT","P1_DEFECT","SECURITY","RELIABILITY","DATA_INTEGRITY","ACCESSIBILITY","REGRESSION","CERTIFICATION_BLOCKER"],
      policy:{scopeExpansionAfterFreezeProhibited:true,exceptionEvidenceRequired:true,exceptionOwnerRequired:true,exceptionRiskRequired:true,regressionProtectionRequired:true,humanFreezeApprovalRequired:true,noAutomaticScopeExpansion:true,noAutomaticExceptionApproval:true,noAutomaticProductMutation:true,autonomousProductionChanges:false},
      nextGate:"FINAL_REGRESSION_SECURITY_AND_DATA_INTEGRITY_CERTIFICATION"};
  }
  async freeze(org,allowed,input,actor){
    const product=await this.productDecisionService.snapshot(org,allowed);
    if(!product.productDecisionReady)throw new Error("Pilot learning product decision control must be complete before commercial product freeze.");
    if(input.scopeFrozen!==true||input.regressionProtectionRequired!==true)throw new Error("scopeFrozen and regressionProtectionRequired must be explicitly acknowledged.");
    const owner=String(input.owner||"").trim(),target=String(input.hardeningTarget||"").trim(),baselineId=String(input.baselineId||"").trim();
    if(!owner||!target||!baselineId)throw new Error("baselineId, owner, and hardeningTarget are required.");
    const permitted=Array.isArray(input.permittedChangeClasses)?input.permittedChangeClasses.map(x=>String(x).toUpperCase()).filter(Boolean):[];
    if(!permitted.length)throw new Error("At least one permittedChangeClass is required.");
    const rec={id:`cpf_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId:org,baselineId:baselineId.slice(0,200),owner:owner.slice(0,200),hardeningTarget:target.slice(0,1000),scopeFrozen:true,regressionProtectionRequired:true,permittedChangeClasses:[...new Set(permitted)].slice(0,30),exceptions:[],createdAt:this.now(),createdBy:actor};
    await this.database.mutate(db=>{db.commercialProductFreezeRecords||=[];db.commercialProductFreezeRecords.push(rec);return rec;});
    await this.auditService.record({organizationId:org,actor,action:`Commercial product freeze recorded ${rec.baselineId}`,category:"commercial_product_freeze"});
    this.realtimeHub.publish("commercial:product-freeze",{organizationId:org,id:rec.id,baselineId:rec.baselineId});return rec;
  }
  async addException(org,input,actor){
    let rec=null,exception=null;
    await this.database.mutate(db=>{
      rec=(db.commercialProductFreezeRecords||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt))[0];
      if(!rec)throw new Error("Commercial product freeze not found.");
      const changeClass=String(input.changeClass||"").toUpperCase(),risk=String(input.risk||"").toUpperCase(),owner=String(input.owner||"").trim(),evidence=String(input.evidence||"").trim();
      if(!rec.permittedChangeClasses.includes(changeClass))throw new Error("Change class is not permitted by the frozen baseline.");
      if(!["LOW","MEDIUM","HIGH","CRITICAL"].includes(risk)||!owner||!evidence)throw new Error("risk, owner, and evidence are required.");
      exception={id:`cfe_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,changeClass,risk,owner:owner.slice(0,200),evidence:evidence.slice(0,5000),status:"OPEN",createdAt:this.now(),createdBy:actor,approved:false};
      rec.exceptions||=[];rec.exceptions.push(exception);return exception;
    });
    await this.auditService.record({organizationId:org,actor,action:`Commercial freeze exception recorded ${exception.id}`,category:"commercial_product_freeze_exception"});
    return exception;
  }
}
module.exports=CommercialProductFreezeFinalHardeningService;
