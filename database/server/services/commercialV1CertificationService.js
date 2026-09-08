"use strict";
class CommercialV1CertificationService {
  constructor(database,auditService,realtimeHub,authorizationService,operationsService,validationService,rcService){
    Object.assign(this,{database,auditService,realtimeHub,authorizationService,operationsService,validationService,rcService});
  }
  now(){return new Date().toISOString();}
  async certifications(org){
    const db=await this.database.read();
    return (db.commercialV1Certifications||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  }
  async snapshot(org,allowed){
    const [authorization,operations,validation,rc,certifications]=await Promise.all([
      this.authorizationService.snapshot(org,allowed),this.operationsService.snapshot(org,allowed),
      this.validationService.snapshot(org,allowed),this.rcService.snapshot(org,allowed),this.certifications(org)
    ]);
    const latest=certifications[0]||null;
    const checks=[
      {id:"V100_RELEASE_AUTHORIZED",passed:authorization.authorized===true,actual:authorization.status},
      {id:"COMMERCIAL_OPERATIONS_SUPPORT_READY",passed:operations.ready===true,actual:operations.status},
      {id:"RC_END_TO_END_VALIDATED",passed:validation.validated===true,actual:validation.status},
      {id:"COMMERCIAL_RC_LOCKED",passed:rc.releaseCandidateLocked===true,actual:rc.status},
      {id:"ZERO_RELEASE_BLOCKERS",passed:(rc.openBlockers||[]).filter(x=>x.releaseBlocking===true).length===0,actual:`${(rc.openBlockers||[]).filter(x=>x.releaseBlocking===true).length} blocker(s)`},
      {id:"CANDIDATE_IDENTITY_PRESERVED",passed:!!validation.candidate?.candidateId&&validation.candidate?.candidateId===authorization.latestAuthorization?.candidateId,actual:validation.candidate?.candidateId||"missing"},
      {id:"ROLLBACK_REFERENCE_PRESERVED",passed:!!validation.candidate?.rollbackReference,actual:validation.candidate?.rollbackReference||"missing"},
      {id:"HUMAN_COMMERCIAL_V1_CERTIFICATION",passed:latest?.decision==="CERTIFIED",actual:latest?.decision||"not certified"}
    ];
    const certified=checks.every(x=>x.passed);
    return {version:"100.0.0",gate:"V100_COMMERCIAL_V1_CERTIFICATION",generatedAt:this.now(),certified,
      status:certified?"BLUE_CURRENT_COMMERCIAL_V1_CERTIFIED":"COMMERCIAL_V1_CERTIFICATION_PENDING",
      checks,latestCertification:latest,candidate:validation.candidate,
      certificationChain:["COMMERCIAL_PRODUCT_FREEZE_AND_FINAL_HARDENING","FINAL_REGRESSION_SECURITY_AND_DATA_INTEGRITY_CERTIFICATION","FINAL_OPERATOR_UX_ACCESSIBILITY_AND_SERVICE_READINESS_CERTIFICATION","COMMERCIAL_RELEASE_CANDIDATE_LOCK","RELEASE_CANDIDATE_END_TO_END_VALIDATION","COMMERCIAL_OPERATIONS_AND_SUPPORT_READINESS","FINAL_GO_NO_GO_AND_V100_RELEASE_AUTHORIZATION","V100_COMMERCIAL_V1_CERTIFICATION"],
      policy:{commercialBaselineImmutable:true,certificationRequiresHumanAuthorization:true,certificationDoesNotDeploy:true,certificationDoesNotMutateProduction:true,newBlockerInvalidatesCertification:true,releaseCandidateMutationInvalidatesCertification:true,noAutomaticDeployment:true,noAutomaticCommercialRelease:true,autonomousProductionChanges:false},
      lifecycle:"COMMERCIAL_V1_BASELINE"};
  }
  async certify(org,allowed,input,actor){
    const [authorization,operations,validation,rc]=await Promise.all([
      this.authorizationService.snapshot(org,allowed),this.operationsService.snapshot(org,allowed),
      this.validationService.snapshot(org,allowed),this.rcService.snapshot(org,allowed)
    ]);
    if(!authorization.authorized)throw new Error("V100 release authorization must be GO before Commercial V1 certification.");
    if(!operations.ready||!validation.validated||!rc.releaseCandidateLocked)throw new Error("Commercial readiness chain is not clear.");
    if((rc.openBlockers||[]).some(x=>x.releaseBlocking===true))throw new Error("Release blockers must be zero.");
    const acceptance=String(input.acceptance||"").trim(),notes=String(input.notes||"").trim();
    if(!acceptance)throw new Error("acceptance is required.");
    const rec={id:`v100cert_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId:org,
      decision:"CERTIFIED",candidateId:validation.candidate.candidateId,sourceRevision:validation.candidate.sourceRevision,
      buildIdentity:validation.candidate.buildIdentity,rollbackReference:validation.candidate.rollbackReference,
      acceptance:acceptance.slice(0,5000),notes:notes.slice(0,5000)||null,createdAt:this.now(),createdBy:actor,
      deploymentPerformed:false,productionMutationPerformed:false};
    await this.database.mutate(db=>{db.commercialV1Certifications||=[];db.commercialV1Certifications.push(rec);return rec;});
    await this.auditService.record({organizationId:org,actor,action:`Blue Current Commercial V1 certified: ${rec.candidateId}`,category:"commercial_v1_certification"});
    this.realtimeHub.publish("commercial:v1-certified",{organizationId:org,id:rec.id,candidateId:rec.candidateId});
    return rec;
  }
}
module.exports=CommercialV1CertificationService;
