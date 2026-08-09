"use strict";

class ProductionPilotEnvironmentReadinessService{
  constructor(database,auditService,realtimeHub,v55DecisionValueCertificationService,technicalActivationReadinessService,pilotDeploymentPackageService,productionHealthSupportService,productionRecoveryReviewService){
    Object.assign(this,{database,auditService,realtimeHub,v55DecisionValueCertificationService,technicalActivationReadinessService,pilotDeploymentPackageService,productionHealthSupportService,productionRecoveryReviewService});
  }
  now(){return new Date().toISOString();}
  async reviews(org){const db=await this.database.read();return (db.productionPilotEnvironmentReviews||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.reviewedAt)-new Date(a.reviewedAt));}
  async certifications(org){const db=await this.database.read();return (db.productionPilotEnvironmentCertifications||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.certifiedAt)-new Date(a.certifiedAt));}
  async snapshot(org,allowed){
    const [db,v55,technical,deployment,health,recovery,reviews,certs]=await Promise.all([
      this.database.read(),
      this.v55DecisionValueCertificationService.snapshot(org,allowed),
      this.technicalActivationReadinessService.snapshot(org,allowed),
      this.pilotDeploymentPackageService.snapshot(org,allowed),
      this.productionHealthSupportService.snapshot(org,allowed),
      this.productionRecoveryReviewService.snapshot(org,allowed),
      this.reviews(org),this.certifications(org)
    ]);
    const review=reviews[0]||null,cert=certs[0]||null;
    const locations=(db.locations||[]).filter(x=>x.organizationId===org&&(allowed.includes("*")||allowed.includes(x.id)));
    const technicalReady=(technical.locations||[]).length>0&&(technical.locations||[]).every(x=>x.technicallyReady||x.goLiveAuthorization?.status==="AUTHORIZED_FOR_GO_LIVE");
    const deploymentReady=(deployment.locations||[]).length>0&&(deployment.locations||[]).every(x=>x.deploymentReady||x.certification?.status==="PILOT_DEPLOYMENT_CERTIFIED");
    const healthAvailable=!!health && health.status!=="production-health-unavailable";
    const recoveryAvailable=!!recovery && recovery.status!=="production-recovery-unavailable";
    const checks=[
      {id:"V55_CERTIFIED",passed:!!v55.certification,actual:v55.status},
      {id:"TARGET_LOCATIONS",passed:locations.length>0,actual:`${locations.length} location(s)`},
      {id:"TECHNICAL_READINESS",passed:technicalReady,actual:technical.status},
      {id:"DEPLOYMENT_PACKAGE",passed:deploymentReady,actual:deployment.status},
      {id:"PRODUCTION_HEALTH_MODEL",passed:healthAvailable,actual:health.status||"available"},
      {id:"RECOVERY_MODEL",passed:recoveryAvailable,actual:recovery.status||"available"},
      {id:"ENVIRONMENT_CONFIGURATION",passed:review?.environmentConfiguration==="PASS",actual:review?.environmentConfiguration||"not reviewed"},
      {id:"SECRETS_CONFIGURATION",passed:review?.secretsConfiguration==="PASS",actual:review?.secretsConfiguration||"not reviewed"},
      {id:"AUTH_SECURITY",passed:review?.authSecurity==="PASS",actual:review?.authSecurity||"not reviewed"},
      {id:"PERSISTENCE_BACKUP",passed:review?.persistenceBackup==="PASS",actual:review?.persistenceBackup||"not reviewed"},
      {id:"OBSERVABILITY_ALERTING",passed:review?.observabilityAlerting==="PASS",actual:review?.observabilityAlerting||"not reviewed"},
      {id:"CONNECTOR_READINESS",passed:review?.connectorReadiness==="PASS",actual:review?.connectorReadiness||"not reviewed"},
      {id:"SUPPORT_ESCALATION",passed:review?.supportEscalation==="PASS",actual:review?.supportEscalation||"not reviewed"},
      {id:"ROLLBACK_RECOVERY",passed:review?.rollbackRecovery==="PASS",actual:review?.rollbackRecovery||"not reviewed"},
      {id:"PILOT_RUNBOOK",passed:!!review?.pilotRunbook,actual:review?.pilotRunbook?"documented":"missing"},
      {id:"GO_NO_GO",passed:review?.goNoGo==="GO",actual:review?.goNoGo||"not decided"},
      {id:"HUMAN_ENVIRONMENT_CERTIFICATION",passed:!!cert,actual:cert?.decision||"not certified"}
    ];
    const readinessReady=checks.slice(0,-1).every(x=>x.passed);
    return {version:"56.50.0",generatedAt:this.now(),status:cert?.decision==="GO"?"production-pilot-environment-ready":cert?.decision==="HOLD"?"production-pilot-environment-hold":review?"production-pilot-environment-in-review":"production-pilot-environment-review-required",headline:`Production/pilot environment ${readinessReady?"READY":"OPEN"} · ${checks.filter(x=>x.passed).length}/${checks.length} gates pass.`,locations:locations.map(x=>({locationId:x.id,locationName:x.name||x.displayName||x.id})),checks,readinessReady,review,certification:cert,linked:{v55:v55.status,technical:technical.status,deployment:deployment.status,health:health.status,recovery:recovery.status},policy:{humanEnvironmentReviewRequired:true,secretsMustNotBeExposed:true,authSecurityReviewRequired:true,persistenceBackupReviewRequired:true,observabilityAlertingRequired:true,connectorReadinessRequired:true,supportEscalationRequired:true,rollbackRecoveryRequired:true,pilotRunbookRequired:true,humanGoNoGoRequired:true,certificationDoesNotDeploy:true,certificationDoesNotCutOver:true,certificationDoesNotActivatePilot:true,certificationDoesNotMutateRestaurantState:true,autonomousProductionChanges:false}};
  }
  async review(org,allowed,input,actor){
    const passFields=["environmentConfiguration","secretsConfiguration","authSecurity","persistenceBackup","observabilityAlerting","connectorReadiness","supportEscalation","rollbackRecovery"];
    for(const k of passFields)if(!["PASS","FAIL"].includes(String(input[k]||"").toUpperCase()))throw new Error(`${k} must be PASS or FAIL.`);
    const pilotRunbook=String(input.pilotRunbook||"").trim();if(!pilotRunbook)throw new Error("pilotRunbook is required.");
    const goNoGo=String(input.goNoGo||"").toUpperCase();if(!["GO","HOLD"].includes(goNoGo))throw new Error("goNoGo must be GO or HOLD.");
    const record={id:`pper_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId:org,reviewedAt:this.now(),reviewedBy:actor,...Object.fromEntries(passFields.map(k=>[k,String(input[k]).toUpperCase()])),pilotRunbook:pilotRunbook.slice(0,5000),goNoGo,note:String(input.note||"").trim().slice(0,2500),deploymentPerformed:false,cutoverPerformed:false,pilotActivated:false,restaurantStateMutated:false};
    await this.database.mutate(db=>{db.productionPilotEnvironmentReviews||=[];db.productionPilotEnvironmentReviews.push(record);return record;});
    await this.auditService.record({organizationId:org,actor,action:`Production/pilot environment review recorded: ${goNoGo}`,category:"production_pilot_readiness"});
    return record;
  }
  async certify(org,allowed,input,actor){
    const state=await this.snapshot(org,allowed);const decision=String(input.decision||"").toUpperCase(),evidence=String(input.evidence||"").trim(),reason=String(input.reason||"").trim();
    if(!["GO","HOLD"].includes(decision))throw new Error("Decision must be GO or HOLD.");
    if(!evidence)throw new Error("Certification evidence is required.");
    if(decision==="GO"&&!state.readinessReady&&!reason)throw new Error("GO with open readiness gates requires an executive override reason.");
    if(decision==="HOLD"&&!reason)throw new Error("HOLD requires a documented reason.");
    const record={id:`ppec_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId:org,decision,status:"PRODUCTION_PILOT_ENVIRONMENT_CERTIFIED",certifiedAt:this.now(),certifiedBy:actor,evidence:evidence.slice(0,4500),reason:reason.slice(0,2500),gateSnapshot:state.checks,deploymentPerformedByCertification:false,cutoverPerformedByCertification:false,pilotActivatedByCertification:false,restaurantStateMutatedByCertification:false,autonomousProductionChanges:false};
    await this.database.mutate(db=>{db.productionPilotEnvironmentCertifications||=[];db.productionPilotEnvironmentCertifications.push(record);return record;});
    await this.auditService.record({organizationId:org,actor,action:`Production/pilot environment ${decision} certified; no deployment or cutover performed`,category:"production_pilot_readiness"});
    return record;
  }
}
module.exports=ProductionPilotEnvironmentReadinessService;
