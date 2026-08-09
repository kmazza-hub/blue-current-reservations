"use strict";

class V49ReleaseCertificationService {
  constructor(database,rolloutActivationControlService,technicalActivationReadinessService,locationDeploymentPackageService,goLiveCommandService,launchStabilizationService){
    Object.assign(this,{database,rolloutActivationControlService,technicalActivationReadinessService,locationDeploymentPackageService,goLiveCommandService,launchStabilizationService});
  }
  now(){return new Date().toISOString();}
  async snapshot(organizationId,allowedLocationIds){
    const [activation,technical,deployment,command,stabilization]=await Promise.all([
      this.rolloutActivationControlService.snapshot(organizationId,allowedLocationIds),
      this.technicalActivationReadinessService.snapshot(organizationId,allowedLocationIds),
      this.locationDeploymentPackageService.snapshot(organizationId,allowedLocationIds),
      this.goLiveCommandService.snapshot(organizationId,allowedLocationIds),
      this.launchStabilizationService.snapshot(organizationId,allowedLocationIds)
    ]);

    const architectureContracts=[
      {
        id:"activation-human-control",
        label:"Activation approval remains human/admin controlled",
        passed:activation.policy?.explicitHumanApprovalRequired===true&&
          activation.policy?.automaticApproval===false&&
          activation.policy?.automaticActivation===false&&
          activation.policy?.automaticDeployment===false
      },
      {
        id:"technical-human-control",
        label:"Technical go-live authorization does not cut over production",
        passed:technical.policy?.humanGoLiveAuthorizationRequired===true&&
          technical.policy?.authorizationDoesNotDeploy===true&&
          technical.policy?.automaticProvisioning===false&&
          technical.policy?.automaticCutover===false&&
          technical.policy?.automaticGoLive===false
      },
      {
        id:"deployment-separation",
        label:"Deployment package preparation remains separate from execution",
        passed:deployment.policy?.packagePreparationDoesNotDeploy===true&&
          deployment.policy?.deploymentExecutionSeparate===true&&
          deployment.policy?.automaticProvisioning===false&&
          deployment.policy?.automaticDeployment===false&&
          deployment.policy?.automaticCutover===false
      },
      {
        id:"manual-cutover",
        label:"Production cutover remains manually executed and human recorded",
        passed:command.policy?.explicitExecutionAuthorizationRequired===true&&
          command.policy?.authorizationDoesNotExecuteDeployment===true&&
          command.policy?.resultRecordingIsManual===true&&
          command.policy?.automatedCutover===false&&
          command.policy?.autonomousProductionDeployment===false
      },
      {
        id:"stabilization-human-control",
        label:"Stabilization and rollback remain human decisions",
        passed:stabilization.policy?.observationIsHumanRecorded===true&&
          stabilization.policy?.rollbackRecommendationIsAdvisory===true&&
          stabilization.policy?.humanStabilizationDeclarationRequired===true&&
          stabilization.policy?.autonomousRollback===false&&
          stabilization.policy?.automaticStableDeclaration===false
      }
    ];

    const liveStateContracts=[
      {id:"activation-state",label:"Rollout activation review has locations",passed:(activation.locations||[]).length>0,state:activation.status},
      {id:"technical-state",label:"Technical activation review has locations",passed:(technical.locations||[]).length>0,state:technical.status},
      {id:"deployment-state",label:"Deployment-package review has locations",passed:(deployment.locations||[]).length>0,state:deployment.status},
      {id:"cutover-state",label:"Go-Live Command has launched/cutover locations",passed:(command.locations||[]).length>0,state:command.status},
      {id:"stabilization-state",label:"Launch Stabilization has launched locations",passed:(stabilization.locations||[]).length>0,state:stabilization.status}
    ];

    const architecturePassed=architectureContracts.filter(x=>x.passed).length;
    const liveStatePassed=liveStateContracts.filter(x=>x.passed).length;
    const fullyStabilized=(stabilization.locations||[]).length>0&&stabilization.locations.every(x=>x.declaration?.decision==="STABLE");

    return {
      version:"49.30.0",
      generatedAt:this.now(),
      status:architecturePassed===architectureContracts.length
        ? (fullyStabilized?"V49-CERTIFIED-LIVE":"V49-ARCHITECTURE-CERTIFIED")
        : "V49-CERTIFICATION-FAILED",
      headline:architecturePassed===architectureContracts.length
        ? (fullyStabilized
          ?"V49 rollout architecture and the current live rollout state are fully certified through stabilization."
          :"V49 rollout architecture is certified. Current live rollout state still has prerequisite execution/stabilization steps open.")
        :"One or more V49 human-control architecture contracts failed certification.",
      architectureContracts,
      architecturePassed,
      architectureTotal:architectureContracts.length,
      liveStateContracts,
      liveStatePassed,
      liveStateTotal:liveStateContracts.length,
      chain:[
        {stage:"ACTIVATE",state:activation.status},
        {stage:"TECHNICAL",state:technical.status},
        {stage:"PACKAGE",state:deployment.status},
        {stage:"CUTOVER",state:command.status},
        {stage:"STABILIZE",state:stabilization.status}
      ],
      totals:{
        activationLocations:(activation.locations||[]).length,
        technicallyReady:(technical.locations||[]).filter(x=>x.technicallyReady).length,
        packagesPrepared:(deployment.locations||[]).filter(x=>x.packageState==="READY_FOR_DEPLOYMENT_EXECUTION").length,
        cutoverResults:(command.locations||[]).filter(x=>x.result).length,
        stableDeclarations:(stabilization.locations||[]).filter(x=>x.declaration?.decision==="STABLE").length
      },
      policy:{
        readOnlyCertification:true,
        automaticApproval:false,
        automaticProvisioning:false,
        automaticDeployment:false,
        automaticCutover:false,
        automaticGoLive:false,
        autonomousRollback:false,
        humanRolloutControl:true
      }
    };
  }
}
module.exports=V49ReleaseCertificationService;
