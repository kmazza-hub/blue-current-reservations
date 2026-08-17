"use strict";
class CommercialDefectFrictionRegressionControlService {
  constructor(database,auditService,realtimeHub,baselineLockService) {
    Object.assign(this,{database,auditService,realtimeHub,baselineLockService});
  }
  now(){return new Date().toISOString();}
  async items(org){
    const db=await this.database.read();
    return (db.commercialHardeningIssues||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));
  }
  classify(item){
    const severity=String(item.severity||"MEDIUM").toUpperCase();
    const type=String(item.type||"DEFECT").toUpperCase();
    const releaseBlocking=["CRITICAL","HIGH"].includes(severity) || item.releaseBlocking===true;
    return {...item,severity,type,releaseBlocking};
  }
  async snapshot(org,allowed){
    const [baseline,raw]=await Promise.all([this.baselineLockService.snapshot(org,allowed),this.items(org)]);
    const items=raw.map(x=>this.classify(x));
    const open=items.filter(x=>!["RESOLVED","VERIFIED","CLOSED"].includes(x.status));
    const blockers=open.filter(x=>x.releaseBlocking);
    const unverified=items.filter(x=>x.status==="RESOLVED");
    const friction=open.filter(x=>x.type==="OPERATOR_FRICTION");
    const regressions=open.filter(x=>x.type==="REGRESSION");
    return {
      version:"96.50.0",gate:"COMMERCIAL_HARDENING_DEFECT_AND_FRICTION_CONTROL",generatedAt:this.now(),
      baselineReady:baseline.entryReady===true,
      releaseState:!baseline.entryReady?"BASELINE_LOCK_REQUIRED":blockers.length?"RELEASE_BLOCKED":unverified.length?"VERIFICATION_REQUIRED":"HARDENING_CLEAR",
      summary:{total:items.length,open:open.length,releaseBlockers:blockers.length,operatorFriction:friction.length,regressions:regressions.length,resolvedAwaitingVerification:unverified.length},
      items,
      severityPolicy:{CRITICAL:"RELEASE_BLOCKING",HIGH:"RELEASE_BLOCKING",MEDIUM:"PRIORITIZED",LOW:"BACKLOG_ALLOWED"},
      requiredLifecycle:["OPEN","TRIAGED","IN_PROGRESS","RESOLVED","VERIFIED","CLOSED"],
      evidenceRequirements:["REPRODUCTION_EVIDENCE","ROOT_CAUSE","RESOLUTION_EVIDENCE","REGRESSION_TEST","HUMAN_VERIFICATION"],
      policy:{criticalHighBlockRelease:true,resolvedRequiresHumanVerification:true,regressionsRequireRegressionEvidence:true,operatorFrictionIsCommercialHardeningWork:true,noAutomaticClose:true,noAutomaticRelease:true,autonomousProductionChanges:false},
      nextGate:"COMMERCIAL_HARDENING_PRODUCTION_RELIABILITY_AND_SUPPORTABILITY"
    };
  }
  async record(org,input,actor){
    const type=String(input.type||"DEFECT").toUpperCase(),severity=String(input.severity||"MEDIUM").toUpperCase();
    if(!["DEFECT","OPERATOR_FRICTION","REGRESSION"].includes(type))throw new Error("type must be DEFECT, OPERATOR_FRICTION, or REGRESSION.");
    if(!["CRITICAL","HIGH","MEDIUM","LOW"].includes(severity))throw new Error("severity must be CRITICAL, HIGH, MEDIUM, or LOW.");
    const title=String(input.title||"").trim(),evidence=String(input.evidence||"").trim();
    if(!title||!evidence)throw new Error("title and reproduction/observation evidence are required.");
    const now=this.now(),item={id:`hard_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId:org,type,severity,title:title.slice(0,300),evidence:evidence.slice(0,5000),status:"OPEN",releaseBlocking:["CRITICAL","HIGH"].includes(severity)||input.releaseBlocking===true,createdAt:now,updatedAt:now,createdBy:actor,rootCause:null,resolutionEvidence:null,regressionTest:null,verifiedBy:null,verifiedAt:null};
    await this.database.mutate(db=>{db.commercialHardeningIssues||=[];db.commercialHardeningIssues.push(item);return item;});
    await this.auditService.record({organizationId:org,actor,action:`Commercial hardening issue recorded ${item.id}`,category:"commercial_hardening_issue"});
    this.realtimeHub.publish("commercial-hardening:issue",{organizationId:org,id:item.id,type,severity});
    return item;
  }
}
module.exports=CommercialDefectFrictionRegressionControlService;
