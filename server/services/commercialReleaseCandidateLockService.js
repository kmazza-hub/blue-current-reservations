"use strict";
class CommercialReleaseCandidateLockService {
  constructor(database,auditService,realtimeHub,operatorReadinessService){
    Object.assign(this,{database,auditService,realtimeHub,operatorReadinessService});
  }
  now(){return new Date().toISOString();}
  async locks(org){
    const db=await this.database.read();
    return (db.commercialReleaseCandidateLocks||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  }
  async snapshot(org,allowed){
    const [readiness,locks]=await Promise.all([this.operatorReadinessService.snapshot(org,allowed),this.locks(org)]);
    const latest=locks[0]||null,blockers=latest?.blockers||[];
    const open=blockers.filter(x=>x.status!=="CLOSED"),releaseBlocking=open.filter(x=>x.releaseBlocking===true);
    const checks=[
      {id:"FINAL_OPERATOR_READINESS_CLEAR",passed:readiness.certified===true,actual:readiness.status},
      {id:"RELEASE_CANDIDATE_IDENTITY_LOCKED",passed:!!latest?.candidateId,actual:latest?.candidateId||"missing"},
      {id:"SOURCE_REVISION_RECORDED",passed:!!latest?.sourceRevision,actual:latest?.sourceRevision||"missing"},
      {id:"BUILD_IDENTITY_RECORDED",passed:!!latest?.buildIdentity,actual:latest?.buildIdentity||"missing"},
      {id:"SCOPE_LOCK_ACKNOWLEDGED",passed:latest?.scopeLocked===true,actual:String(latest?.scopeLocked===true)},
      {id:"CERTIFICATION_CHAIN_ACKNOWLEDGED",passed:latest?.certificationChainAcknowledged===true,actual:String(latest?.certificationChainAcknowledged===true)},
      {id:"NO_OPEN_RELEASE_BLOCKERS",passed:releaseBlocking.length===0,actual:`${releaseBlocking.length} release blocker(s)`},
      {id:"ROLLBACK_REFERENCE_RECORDED",passed:!!latest?.rollbackReference,actual:latest?.rollbackReference||"missing"},
      {id:"HUMAN_RC_OWNER_ASSIGNED",passed:!!latest?.owner,actual:latest?.owner||"missing"}
    ];
    const locked=checks.every(x=>x.passed);
    return {version:"99.0.0",gate:"COMMERCIAL_RELEASE_CANDIDATE_LOCK",generatedAt:this.now(),
      releaseCandidateLocked:locked,status:locked?"COMMERCIAL_RC_LOCKED":"COMMERCIAL_RC_LOCK_PENDING",
      checks,latestLock:latest,openBlockers:open,operatorReadiness:readiness,
      certificationChain:["COMMERCIAL_PRODUCT_FREEZE_AND_FINAL_HARDENING","FINAL_REGRESSION_SECURITY_AND_DATA_INTEGRITY_CERTIFICATION","FINAL_OPERATOR_UX_ACCESSIBILITY_AND_SERVICE_READINESS_CERTIFICATION"],
      policy:{candidateIdentityImmutable:true,sourceRevisionRequired:true,buildIdentityRequired:true,scopeLockRequired:true,rollbackReferenceRequired:true,releaseBlockersMustBeClosed:true,humanRcOwnerRequired:true,noAutomaticCandidateMutation:true,noAutomaticBlockerWaiver:true,noAutomaticCommercialRelease:true,autonomousProductionChanges:false},
      nextGate:"RELEASE_CANDIDATE_END_TO_END_VALIDATION"};
  }
  async lock(org,allowed,input,actor){
    const readiness=await this.operatorReadinessService.snapshot(org,allowed);
    if(!readiness.certified)throw new Error("Final operator readiness certification must be clear before release candidate lock.");
    if(input.scopeLocked!==true||input.certificationChainAcknowledged!==true)throw new Error("scopeLocked and certificationChainAcknowledged must be explicitly acknowledged.");
    const required=["candidateId","sourceRevision","buildIdentity","rollbackReference","owner"];
    for(const k of required)if(!String(input[k]||"").trim())throw new Error(`${k} is required.`);
    const rec={id:`rcl_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId:org,candidateId:String(input.candidateId).trim().slice(0,200),sourceRevision:String(input.sourceRevision).trim().slice(0,200),buildIdentity:String(input.buildIdentity).trim().slice(0,200),rollbackReference:String(input.rollbackReference).trim().slice(0,1000),owner:String(input.owner).trim().slice(0,200),scopeLocked:true,certificationChainAcknowledged:true,blockers:[],createdAt:this.now(),createdBy:actor,commercialReleaseAuthorized:false};
    await this.database.mutate(db=>{db.commercialReleaseCandidateLocks||=[];db.commercialReleaseCandidateLocks.push(rec);return rec;});
    await this.auditService.record({organizationId:org,actor,action:`Commercial release candidate locked ${rec.candidateId}`,category:"commercial_release_candidate_lock"});
    this.realtimeHub.publish("commercial:release-candidate-lock",{organizationId:org,id:rec.id,candidateId:rec.candidateId});return rec;
  }
  async addBlocker(org,input,actor){
    let blocker=null;
    await this.database.mutate(db=>{
      const rec=(db.commercialReleaseCandidateLocks||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt))[0];
      if(!rec)throw new Error("Release candidate lock not found.");
      const title=String(input.title||"").trim(),evidence=String(input.evidence||"").trim(),owner=String(input.owner||"").trim();
      if(!title||!evidence||!owner)throw new Error("title, evidence, and owner are required.");
      blocker={id:`rcb_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,title:title.slice(0,500),evidence:evidence.slice(0,5000),owner:owner.slice(0,200),releaseBlocking:input.releaseBlocking!==false,status:"OPEN",createdAt:this.now(),createdBy:actor};
      rec.blockers||=[];rec.blockers.push(blocker);return blocker;
    });
    await this.auditService.record({organizationId:org,actor,action:`RC blocker recorded ${blocker.id}`,category:"commercial_release_candidate_blocker"});return blocker;
  }
}
module.exports=CommercialReleaseCandidateLockService;
