"use strict";

class PilotTrainingRunbookOperatorEnablementReadinessService {
  constructor(database,v54OperatorExperienceCertificationService,pilotDeploymentPackageService) {
    Object.assign(this,{database,v54OperatorExperienceCertificationService,pilotDeploymentPackageService});
  }
  async current(organizationId,allowedLocationIds) {
    const [ux,deployment,db]=await Promise.all([
      this.v54OperatorExperienceCertificationService.snapshot(organizationId,allowedLocationIds),
      this.pilotDeploymentPackageService.snapshot(organizationId,allowedLocationIds),
      this.database.read()
    ]);
    const uxChecks=new Map((ux.checks||[]).map(x=>[x.id,x]));
    const requiredUx=["LIVE_SERVICE_USABILITY","TRAINING_BURDEN","SHIFT_HANDOFF","ACCESSIBILITY_READABILITY","OPERATOR_ACCEPTANCE","MANAGER_ACCEPTANCE"];
    const locations=(deployment.locations||[]).map(loc=>{
      const packageChecks=new Map((loc.checks||[]).map(x=>[x.id,x]));
      const requiredPackage=["ACCESS_PACKAGE","BACKUP_RESTORE","STARTUP_RESTART","SUPPORT_ESCALATION","ROLLBACK","DEPLOYMENT_EVIDENCE"];
      const checks=[
        ...requiredUx.map(id=>uxChecks.get(id)).filter(Boolean),
        ...requiredPackage.map(id=>packageChecks.get(id)).filter(Boolean)
      ];
      const pilotAcceptance=(db.pilotOperatorAcceptances?.[organizationId])||null;
      checks.push({id:"CURRENT_PILOT_OPERATOR_ACCEPTANCE",passed:pilotAcceptance?.status==="ACCEPTED",actual:pilotAcceptance?.status||"not accepted"});
      return {
        locationId:loc.locationId,locationName:loc.locationName,
        checks,passed:checks.filter(x=>x.passed).length,total:checks.length,
        ready:checks.length===requiredUx.length+requiredPackage.length+1 && checks.every(x=>x.passed)
      };
    });
    return {
      version:"94.50.0",
      gate:"PILOT_TRAINING_RUNBOOK_AND_OPERATOR_ENABLEMENT_READINESS",
      generatedAt:new Date().toISOString(),
      ready:locations.length>0 && locations.every(x=>x.ready),
      locations,
      enablement:{
        liveServiceUsabilityRequired:true,
        trainingBurdenReviewRequired:true,
        shiftHandoffRequired:true,
        accessibilityReadabilityRequired:true,
        operatorAcceptanceRequired:true,
        managerAcceptanceRequired:true
      },
      runbooks:{
        startupRestartRequired:true,
        backupRestoreRequired:true,
        supportEscalationRequired:true,
        rollbackRequired:true,
        accessPackageRequired:true,
        deploymentEvidenceRequired:true
      },
      boundary:{
        humanOperatorAcceptanceRequired:true,
        humanManagerAcceptanceRequired:true,
        humanSupportOwnershipRequired:true,
        trainingDoesNotGrantPermissions:true,
        trainingDoesNotExecuteRestaurantActions:true,
        autonomousProductionChanges:false
      },
      nextGate:"PILOT_FINAL_GO_LIVE_CHECKLIST_AND_LAUNCH_AUTHORIZATION"
    };
  }
}
module.exports=PilotTrainingRunbookOperatorEnablementReadinessService;
