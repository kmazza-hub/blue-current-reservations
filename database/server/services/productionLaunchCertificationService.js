"use strict";

class ProductionLaunchCertificationService {
  constructor(database,auditService,realtimeHub,finalHardeningRealEnvironmentService,productionOperationsHandoffService,pilotLaunchControlService){
    Object.assign(this,{database,auditService,realtimeHub,finalHardeningRealEnvironmentService,productionOperationsHandoffService,pilotLaunchControlService});
  }
  now(){return new Date().toISOString();}
  async reviews(org){
    const db=await this.database.read();
    return (db.productionLaunchReviews||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.reviewedAt)-new Date(a.reviewedAt));
  }
  async certifications(org){
    const db=await this.database.read();
    return (db.productionLaunchCertifications||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.certifiedAt)-new Date(a.certifiedAt));
  }
  async snapshot(org,allowed){
    const [hardening,handoff,launch,reviews,certs]=await Promise.all([
      this.finalHardeningRealEnvironmentService.snapshot(org,allowed),
      this.productionOperationsHandoffService.snapshot(org,allowed),
      this.pilotLaunchControlService.snapshot(org,allowed),
      this.reviews(org),this.certifications(org)
    ]);
    const review=reviews[0]||null,cert=certs[0]||null;
    const hardeningReady=hardening.certification?.decision==="SHIP"||hardening.hardeningReady===true;
    const handoffReady=(handoff.locations||[]).length>0&&(handoff.locations||[]).every(x=>x.acceptance?.status==="ACCEPTED_INTO_PRODUCTION_OPERATIONS"||x.productionReady===true);
    const launchControlReady=(launch.locations||[]).length>0&&(launch.locations||[]).every(x=>x.launchReady||x.authorization?.status==="PILOT_LAUNCH_AUTHORIZED");
    const checks=[
      {id:"FINAL_HARDENING_SHIP",passed:hardeningReady,actual:hardening.status},
      {id:"PRODUCTION_OPERATIONS_HANDOFF",passed:handoffReady,actual:handoff.status},
      {id:"LAUNCH_CONTROL",passed:launchControlReady,actual:launch.status},
      {id:"RELEASE_ARTIFACT_IDENTITY",passed:!!review?.releaseVersion&&!!review?.buildHash,actual:review?.releaseVersion?`${review.releaseVersion} · ${review.buildHash}`:"missing"},
      {id:"DEPLOYMENT_PLAN",passed:!!review?.deploymentPlan,actual:review?.deploymentPlan?"documented":"missing"},
      {id:"CUTOVER_PLAN",passed:!!review?.cutoverPlan,actual:review?.cutoverPlan?"documented":"missing"},
      {id:"ROLLBACK_AUTHORITY",passed:!!review?.rollbackAuthority,actual:review?.rollbackAuthority||"missing"},
      {id:"LAUNCH_OWNER",passed:!!review?.launchOwner,actual:review?.launchOwner||"missing"},
      {id:"SUPPORT_OWNER",passed:!!review?.supportOwner,actual:review?.supportOwner||"missing"},
      {id:"ESCALATION_OWNER",passed:!!review?.escalationOwner,actual:review?.escalationOwner||"missing"},
      {id:"CUSTOMER_ACTIVATION_CONTROL",passed:review?.customerActivationControl==="PASS",actual:review?.customerActivationControl||"not reviewed"},
      {id:"CHANGE_FREEZE",passed:review?.changeFreeze==="PASS",actual:review?.changeFreeze||"not reviewed"},
      {id:"MONITORING_WINDOW",passed:!!review?.monitoringWindow,actual:review?.monitoringWindow||"missing"},
      {id:"LAUNCH_SUCCESS_CRITERIA",passed:!!review?.launchSuccessCriteria,actual:review?.launchSuccessCriteria?"documented":"missing"},
      {id:"LAUNCH_ABORT_CRITERIA",passed:!!review?.launchAbortCriteria,actual:review?.launchAbortCriteria?"documented":"missing"},
      {id:"RELEASE_DOCUMENTATION",passed:review?.releaseDocumentation==="PASS",actual:review?.releaseDocumentation||"not reviewed"},
      {id:"FINAL_RELEASE_RECOMMENDATION",passed:review?.recommendation==="RELEASE",actual:review?.recommendation||"not decided"},
      {id:"HUMAN_RELEASE_REVISE_HOLD",passed:!!cert,actual:cert?.decision||"not certified"}
    ];
    const launchReady=checks.slice(0,-1).every(x=>x.passed);
    return {
      version:"59.0.0",generatedAt:this.now(),
      status:cert?.decision==="RELEASE"?"finished-product-release-certified":
             cert?.decision==="REVISE"?"finished-product-release-revise":
             cert?.decision==="HOLD"?"finished-product-release-hold":
             review?"production-launch-certification-in-review":"production-launch-certification-required",
      headline:`Production Launch Certification ${launchReady?"READY":"OPEN"} · ${checks.filter(x=>x.passed).length}/${checks.length} gates pass.`,
      launchReady,checks,review,certification:cert,
      linked:{hardening:hardening.status,productionHandoff:handoff.status,launchControl:launch.status},
      policy:{
        finishedProductCertification:true,
        launchOwnerRequired:true,
        supportOwnershipRequired:true,
        rollbackAuthorityRequired:true,
        customerActivationControlRequired:true,
        changeFreezeRequired:true,
        monitoringWindowRequired:true,
        launchSuccessCriteriaRequired:true,
        launchAbortCriteriaRequired:true,
        humanReleaseReviseHoldRequired:true,
        certificationDoesNotDeploy:true,
        certificationDoesNotPerformCutover:true,
        certificationDoesNotStartRuntime:true,
        certificationDoesNotActivateCustomer:true,
        certificationDoesNotExpandLocations:true,
        certificationDoesNotMutateRestaurantState:true,
        autonomousProductionChanges:false
      }
    };
  }
  async review(org,allowed,input,actor){
    for(const k of ["customerActivationControl","changeFreeze","releaseDocumentation"]){
      if(!["PASS","FAIL"].includes(String(input[k]||"").toUpperCase()))throw new Error(`${k} must be PASS or FAIL.`);
    }
    const required=["releaseVersion","buildHash","deploymentPlan","cutoverPlan","rollbackAuthority","launchOwner","supportOwner","escalationOwner","monitoringWindow","launchSuccessCriteria","launchAbortCriteria"];
    for(const k of required)if(!String(input[k]||"").trim())throw new Error(`${k} is required.`);
    const recommendation=String(input.recommendation||"").toUpperCase();
    if(!["RELEASE","REVISE","HOLD"].includes(recommendation))throw new Error("recommendation must be RELEASE, REVISE, or HOLD.");
    const record={
      id:`plr_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId:org,
      reviewedAt:this.now(),reviewedBy:actor,
      releaseVersion:String(input.releaseVersion).trim().slice(0,120),
      buildHash:String(input.buildHash).trim().slice(0,256),
      deploymentPlan:String(input.deploymentPlan).trim().slice(0,7000),
      cutoverPlan:String(input.cutoverPlan).trim().slice(0,7000),
      rollbackAuthority:String(input.rollbackAuthority).trim().slice(0,300),
      launchOwner:String(input.launchOwner).trim().slice(0,300),
      supportOwner:String(input.supportOwner).trim().slice(0,300),
      escalationOwner:String(input.escalationOwner).trim().slice(0,300),
      customerActivationControl:String(input.customerActivationControl).toUpperCase(),
      changeFreeze:String(input.changeFreeze).toUpperCase(),
      monitoringWindow:String(input.monitoringWindow).trim().slice(0,1000),
      launchSuccessCriteria:String(input.launchSuccessCriteria).trim().slice(0,5000),
      launchAbortCriteria:String(input.launchAbortCriteria).trim().slice(0,5000),
      releaseDocumentation:String(input.releaseDocumentation).toUpperCase(),
      recommendation,
      note:String(input.note||"").trim().slice(0,3000),
      deploymentPerformed:false,cutoverPerformed:false,runtimeStarted:false,
      customerActivated:false,locationExpansionPerformed:false,restaurantStateMutated:false
    };
    await this.database.mutate(db=>{db.productionLaunchReviews||=[];db.productionLaunchReviews.push(record);return record;});
    await this.auditService.record({organizationId:org,actor,action:`Production launch review recorded: ${recommendation}`,category:"production_launch_certification"});
    this.realtimeHub.publish("production-launch:reviewed",{organizationId:org,id:record.id,recommendation});
    return record;
  }
  async certify(org,allowed,input,actor){
    const state=await this.snapshot(org,allowed);
    const decision=String(input.decision||"").toUpperCase(),evidence=String(input.evidence||"").trim(),reason=String(input.reason||"").trim();
    if(!["RELEASE","REVISE","HOLD"].includes(decision))throw new Error("Decision must be RELEASE, REVISE, or HOLD.");
    if(!evidence)throw new Error("Production launch certification evidence is required.");
    if(decision==="RELEASE"&&!state.launchReady&&!reason)throw new Error("RELEASE with open launch gates requires an executive override reason.");
    if(["REVISE","HOLD"].includes(decision)&&!reason)throw new Error(`${decision} requires a documented reason.`);
    const record={
      id:`plc59_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId:org,
      decision,status:"FINISHED_PRODUCT_RELEASE_CERTIFIED",certifiedAt:this.now(),certifiedBy:actor,
      evidence:evidence.slice(0,7000),reason:reason.slice(0,3500),gateSnapshot:state.checks,
      release:{version:state.review?.releaseVersion||null,buildHash:state.review?.buildHash||null},
      deploymentPerformedByCertification:false,cutoverPerformedByCertification:false,
      runtimeStartedByCertification:false,customerActivatedByCertification:false,
      locationExpansionPerformedByCertification:false,restaurantStateMutatedByCertification:false,
      autonomousProductionChanges:false
    };
    await this.database.mutate(db=>{db.productionLaunchCertifications||=[];db.productionLaunchCertifications.push(record);return record;});
    await this.auditService.record({organizationId:org,actor,action:`Finished product ${decision} certified; no deployment/cutover/customer activation performed`,category:"production_launch_certification"});
    this.realtimeHub.publish("production-launch:certified",{organizationId:org,id:record.id,decision});
    return record;
  }
}
module.exports=ProductionLaunchCertificationService;
