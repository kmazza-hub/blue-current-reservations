"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../.."),pkg=require(path.join(root,"package.json"));
const Health=require(path.join(root,"server/services/integrationHealthCommandService"));

(async()=>{
 assert(Number(pkg.version.split(".")[0]) >= 86);
 const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8");
 const server=fs.readFileSync(path.join(root,"server/server.js"),"utf8");
 assert(router.includes("/api/integrations/health-command"));
 assert(server.includes("IntegrationHealthCommandService"));

 const readiness={report:async()=>({
   summary:{blockers:1,pilotIntegrationReady:false},
   connectors:[
    {connectorId:"toast-pilot",provider:"TOAST",domain:"POS",status:"HEALTHY",healthy:true,stale:false,reconciled:true,missingCapabilities:[],freshnessMinutes:2,maxFreshnessMinutes:15},
    {connectorId:"labor-pilot",provider:"LABOR_PROVIDER",domain:"LABOR",status:"HEALTHY",healthy:false,stale:true,reconciled:false,missingCapabilities:[],freshnessMinutes:45,maxFreshnessMinutes:15}
   ],
   blockers:[{connectorId:"labor-pilot",type:"STALE_DATA",detail:{freshnessMinutes:45,maxFreshnessMinutes:15}}]
 })};

 const sync={report:async()=>({
   summary:{openFailures:1},
   checkpoints:[{connectorId:"toast-pilot",stream:"orders",cursor:"c101",sequence:101,checkpointedAt:new Date().toISOString()}],
   failures:[{connectorId:"labor-pilot",stream:"time",status:"OPEN",reason:"Provider timeout",failedAt:new Date().toISOString()}]
 })};

 const reconciliation={report:async()=>({
   summary:{unresolved:1},
   authority:{POS_TRANSACTION:"EXTERNAL_POS"},
   conflicts:[{
    id:"r1",entityType:"EMPLOYEE",entityId:"e1",field:"status",status:"HUMAN_REVIEW_REQUIRED",
    authoritativeSource:"LABOR_SOURCE",resolution:null,
    observations:[{source:"LABOR_PROVIDER",value:"ACTIVE"},{source:"BLUE_CURRENT",value:"INACTIVE"}]
   }]
 })};

 const svc=new Health(readiness,sync,reconciliation);
 const out=await svc.build("o");

 assert.equal(out.version,"86.75.0");
 assert.equal(out.overallHealth,"DEGRADED");
 assert.equal(out.dataTrust,"USE_WITH_CAUTION");
 assert.equal(out.summary.connectors,2);
 assert.equal(out.summary.degraded,1);
 assert.equal(out.summary.openSyncFailures,1);
 assert.equal(out.summary.unresolvedReconciliationConflicts,1);
 assert.equal(out.summary.pilotIntegrationReady,false);

 const toast=out.connectors.find(x=>x.connectorId==="toast-pilot");
 assert.equal(toast.health,"HEALTHY");
 assert.equal(toast.trust,"TRUSTED");

 const labor=out.connectors.find(x=>x.connectorId==="labor-pilot");
 assert.equal(labor.health,"DEGRADED");
 assert.equal(labor.trust,"USE_WITH_CAUTION");
 assert(labor.recommendedActions.includes("REFRESH_SOURCE"));
 assert(labor.recommendedActions.includes("REPLAY_FROM_CHECKPOINT"));
 assert(labor.recommendedActions.includes("RESOLVE_READINESS_BLOCKERS"));
 assert(labor.recommendedActions.includes("REVIEW_RECONCILIATION_CONFLICTS"));

 assert.equal(out.policy.healthCommandIsReadOnly,true);
 assert.equal(out.policy.degradedSourcesRemainVisible,true);
 assert.equal(out.policy.trustStateMustBeExplicit,true);
 assert.equal(out.policy.noAutomaticWriteBack,true);
 assert.equal(out.policy.noAutomaticOperationalAction,true);
 assert.equal(out.policy.autonomousProductionChanges,false);

 console.log(JSON.stringify({
  ok:true,
  version:"86.75.0",
  unifiedIntegrationHealth:true,
  connectorTrustState:true,
  freshnessVisibility:true,
  syncFailureVisibility:true,
  checkpointVisibility:true,
  reconciliationVisibility:true,
  recommendedRecoveryActions:true,
  pilotIntegrationGate:true,
  noAutomaticWriteBack:true,
  autonomousProductionChanges:false
 },null,2));
})().catch(e=>{console.error(e);process.exit(1);});
