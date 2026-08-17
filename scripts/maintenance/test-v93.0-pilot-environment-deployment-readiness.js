"use strict";
const assert=require("assert"),path=require("path"),fs=require("fs");
const root=path.resolve(__dirname,"../.."),pkg=require(path.join(root,"package.json"));
const ProductionConfigurationService=require(path.join(root,"server/services/productionConfigurationService"));
const PilotEnvironmentDeploymentReadinessService=require(path.join(root,"server/services/pilotEnvironmentDeploymentReadinessService"));
(async()=>{
assert(Number(pkg.version.split(".")[0])>=93);
const temp=path.join(root,"database","data","blue-current.json");
const env={BLUE_CURRENT_ENV:"production",BLUE_CURRENT_ALLOWED_ORIGINS:"https://app.bluecurrentco.com"};
const config=new ProductionConfigurationService({root,databasePath:temp,port:8787,persistenceDriver:"json",persistenceTopology:"single-node-durable-json",environment:env});
const db={read:async()=>({users:[],liveConnectors:[],liveConnectorAuthBindings:{}})};
const report=await new PilotEnvironmentDeploymentReadinessService(config,db).current();
assert.equal(report.version,"93.0.0");assert.equal(report.configurationReady,true);assert.equal(report.deploymentBoundary.singleWriterRequired,true);assert.equal(report.deploymentBoundary.explicitHttpsOriginsRequired,true);assert.equal(report.deploymentBoundary.humanDeploymentApprovalRequired,true);assert.equal(report.deploymentBoundary.automaticDeployment,false);
const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8");assert(router.includes('/api/pilot/environment-readiness'));assert(router.includes('pilotEnvironmentDeploymentReadinessService.current()'));
console.log(JSON.stringify({ok:true,version:"93.0.0",configurationReady:report.configurationReady,productionReady:report.productionReady,requiredChecks:report.checks.length,singleWriterRequired:true,explicitHttpsOriginsRequired:true,humanDeploymentApprovalRequired:true,automaticDeployment:false,automaticPilotLaunch:false,nextGate:"PILOT_BACKUP_RESTORE_AND_ROLLBACK_READINESS"},null,2));
})().catch(e=>{console.error(e);process.exit(1);});
