"use strict";

class FinalGoNoGoV100ReleaseAuthorizationService {
  constructor(database,auditService,realtimeHub,operationsSupportService,endToEndValidationService,releaseCandidateLockService){
    Object.assign(this,{database,auditService,realtimeHub,operationsSupportService,endToEndValidationService,releaseCandidateLockService});
  }
  now(){return new Date().toISOString();}
  async authorizations(org){
    const db=await this.database.read();
    return (db.v100ReleaseAuthorizations||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  }
  async snapshot(org,allowed){
    const [operations,validation,rc,authorizations]=await Promise.all([
      this.operationsSupportService.snapshot(org,allowed),
      this.endToEndValidationService.snapshot(org,allowed),
      this.releaseCandidateLockService.snapshot(org,allowed),
      this.authorizations(org)
    ]);
    const latest=authorizations[0]||null;
    const blockers=(rc.openBlockers||[]).filter(x=>x.releaseBlocking===true);
    const checks=[
      {id:"COMMERCIAL_OPERATIONS_SUPPORT_READY",passed:operations.ready===true,actual:operations.status},
      {id:"RC_END_TO_END_VALIDATED",passed:validation.validated===true,actual:validation.status},
      {id:"COMMERCIAL_RC_LOCKED",passed:rc.releaseCandidateLocked===true,actual:rc.status},
      {id:"NO_OPEN_RELEASE_BLOCKERS",passed:blockers.length===0,actual:`${blockers.length} blocker(s)`},
      {id:"ROLLBACK_REFERENCE_AVAILABLE",passed:!!validation.candidate?.rollbackReference,actual:validation.candidate?.rollbackReference||"missing"},
      {id:"RELEASE_OWNER_CONFIRMED",passed:!!operations.latestReadiness?.deploymentOwner,actual:operations.latestReadiness?.deploymentOwner||"missing"},
      {id:"SUPPORT_OWNER_CONFIRMED",passed:!!operations.latestReadiness?.supportOwner,actual:operations.latestReadiness?.supportOwner||"missing"},
      {id:"ESCALATION_OWNER_CONFIRMED",passed:!!operations.latestReadiness?.escalationOwner,actual:operations.latestReadiness?.escalationOwner||"missing"},
      {id:"HUMAN_V100_RELEASE_AUTHORIZATION",passed:latest?.decision==="GO",actual:latest?.decision||"not authorized"}
    ];
    const authorized=checks.every(x=>x.passed);
    return {
      version:"99.75.0",
      gate:"FINAL_GO_NO_GO_AND_V100_RELEASE_AUTHORIZATION",
      generatedAt:this.now(),
      authorized,
      status:authorized?"V100_RELEASE_AUTHORIZED":latest?.decision==="HOLD"?"V100_RELEASE_HELD":"V100_RELEASE_AUTHORIZATION_PENDING",
      checks,
      latestAuthorization:latest,
      releaseCandidate:validation.candidate,
      operationsReadiness:operations.status,
      policy:{
        explicitHumanGoNoGoRequired:true,
        goDecisionDoesNotDeploy:true,
        holdDecisionPreservesCandidate:true,
        newReleaseBlockerInvalidatesGo:true,
        rcMutationInvalidatesGo:true,
        operationsReadinessRegressionInvalidatesGo:true,
        validationRegressionInvalidatesGo:true,
        rollbackReferenceRequired:true,
        noAutomaticDeployment:true,
        noAutomaticCommercialRelease:true,
        autonomousProductionChanges:false
      },
      nextGate:"V100_COMMERCIAL_V1_CERTIFICATION"
    };
  }
  async decide(org,allowed,input,actor){
    const [operations,validation,rc]=await Promise.all([
      this.operationsSupportService.snapshot(org,allowed),
      this.endToEndValidationService.snapshot(org,allowed),
      this.releaseCandidateLockService.snapshot(org,allowed)
    ]);
    if(!operations.ready)throw new Error("Commercial operations/support readiness must be READY.");
    if(!validation.validated)throw new Error("Release candidate end-to-end validation must be clear.");
    if(!rc.releaseCandidateLocked)throw new Error("Commercial release candidate must be locked.");
    if((rc.openBlockers||[]).some(x=>x.releaseBlocking===true))throw new Error("Open release blockers must be closed before GO authorization.");
    const decision=String(input.decision||"").toUpperCase();
    if(!["GO","HOLD"].includes(decision))throw new Error("decision must be GO or HOLD.");
    const rationale=String(input.rationale||"").trim();
    const releaseWindow=String(input.releaseWindow||"").trim();
    const acceptance=String(input.acceptance||"").trim();
    if(!rationale||!releaseWindow||!acceptance)throw new Error("rationale, releaseWindow, and acceptance are required.");
    const rec={
      id:`v100auth_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      organizationId:org,decision,
      candidateId:validation.candidate?.candidateId||null,
      buildIdentity:validation.candidate?.buildIdentity||null,
      sourceRevision:validation.candidate?.sourceRevision||null,
      rollbackReference:validation.candidate?.rollbackReference||null,
      releaseWindow:releaseWindow.slice(0,1000),
      rationale:rationale.slice(0,6000),
      acceptance:acceptance.slice(0,5000),
      releaseOwner:operations.latestReadiness?.deploymentOwner||null,
      supportOwner:operations.latestReadiness?.supportOwner||null,
      escalationOwner:operations.latestReadiness?.escalationOwner||null,
      createdAt:this.now(),createdBy:actor,
      deploymentPerformed:false,commercialReleasePerformed:false
    };
    await this.database.mutate(db=>{db.v100ReleaseAuthorizations||=[];db.v100ReleaseAuthorizations.push(rec);return rec;});
    await this.auditService.record({organizationId:org,actor,action:`V100 release authorization ${decision}: ${rec.candidateId}`,category:"v100_release_authorization"});
    this.realtimeHub.publish("commercial:v100-release-authorization",{organizationId:org,id:rec.id,decision,candidateId:rec.candidateId});
    return rec;
  }
}
module.exports=FinalGoNoGoV100ReleaseAuthorizationService;
