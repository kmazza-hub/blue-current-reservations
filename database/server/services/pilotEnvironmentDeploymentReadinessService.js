"use strict";

class PilotEnvironmentDeploymentReadinessService {
  constructor(productionConfigurationService, database) {
    this.productionConfigurationService = productionConfigurationService;
    this.database = database;
  }

  async current() {
    const configuration = await this.productionConfigurationService.validate(this.database);
    const required = [
      "node-runtime","runtime-mode","persistence-driver","port","cors-no-wildcard",
      "cors-origin-format","production-origins-explicit","production-origins-https",
      "production-public-url","production-public-url-allowed","production-database-absolute","production-database-outside-repository",
      "production-database-not-cloud-sync","no-plaintext-user-passwords",
      "live-connector-secret-readiness","no-obvious-plaintext-secrets"
    ];
    const byId = new Map((configuration.checks || []).map(check => [check.id, check]));
    const checks = required.map(id => byId.get(id)).filter(Boolean);
    const failed = checks.filter(check => !check.ok && check.severity === "error");
    return {
      version:"93.0.0",
      gate:"PILOT_ENVIRONMENT_AND_DEPLOYMENT_READINESS",
      generatedAt:new Date().toISOString(),
      mode:configuration.mode,
      ready:failed.length===0 && configuration.ready===true,
      configurationReady:configuration.ready===true,
      productionReady:configuration.productionReady===true,
      persistence:{driver:configuration.persistenceDriver,topology:configuration.databaseTopology,databasePath:configuration.databasePath},
      origins:configuration.explicitOrigins,
      publicUrl:configuration.publicUrl,
      checks,
      blockers:failed.map(check => ({id:check.id,detail:check.detail})),
      deploymentBoundary:{
        singleWriterRequired:configuration.persistenceDriver==="json",
        explicitHttpsOriginsRequired:configuration.mode==="production",
        humanDeploymentApprovalRequired:true,
        automaticDeployment:false,
        automaticPilotLaunch:false
      }
    };
  }
}
module.exports = PilotEnvironmentDeploymentReadinessService;
