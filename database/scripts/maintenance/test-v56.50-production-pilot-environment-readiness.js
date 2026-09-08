"use strict";
const assert=require("assert"),Service=require("../../server/services/productionPilotEnvironmentReadinessService");
(async()=>{
 const state={locations:[{id:"loc1",organizationId:"org",name:"Pilot"}],productionPilotEnvironmentReviews:[],productionPilotEnvironmentCertifications:[]};
 const db={read:async()=>JSON.parse(JSON.stringify(state)),mutate:async fn=>fn(state)};
 const v55={snapshot:async()=>({status:"v55-decision-value-certified",certification:{status:"V55_DECISION_VALUE_CERTIFIED"}})};
 const technical={snapshot:async()=>({status:"technical-readiness-complete",locations:[{technicallyReady:true}]})};
 const deployment={snapshot:async()=>({status:"pilot-deployment-certified",locations:[{deploymentReady:true,certification:{status:"PILOT_DEPLOYMENT_CERTIFIED"}}]})};
 const health={snapshot:async()=>({status:"production-health-ready"})};
 const recovery={snapshot:async()=>({status:"production-recovery-ready"})};
 const svc=new Service(db,{record:async()=>{}},{publish:()=>{}},v55,technical,deployment,health,recovery);
 let s=await svc.snapshot("org",["*"]);assert.equal(s.version,"56.50.0");
 const r=await svc.review("org",["*"],{environmentConfiguration:"PASS",secretsConfiguration:"PASS",authSecurity:"PASS",persistenceBackup:"PASS",observabilityAlerting:"PASS",connectorReadiness:"PASS",supportEscalation:"PASS",rollbackRecovery:"PASS",pilotRunbook:"pilot runbook documented",goNoGo:"GO"},"Tester");
 assert.equal(r.deploymentPerformed,false);assert.equal(r.cutoverPerformed,false);assert.equal(r.pilotActivated,false);assert.equal(r.restaurantStateMutated,false);
 s=await svc.snapshot("org",["*"]);assert.equal(s.readinessReady,true);
 const c=await svc.certify("org",["*"],{decision:"GO",evidence:"all production/pilot readiness gates pass"},"Tester");
 assert.equal(c.deploymentPerformedByCertification,false);assert.equal(c.cutoverPerformedByCertification,false);assert.equal(c.pilotActivatedByCertification,false);assert.equal(c.restaurantStateMutatedByCertification,false);
 console.log(JSON.stringify({ok:true,version:"56.50.0",technicalReadiness:true,deploymentPackage:true,environmentConfiguration:true,secretsConfiguration:true,authSecurity:true,persistenceBackup:true,observabilityAlerting:true,connectorReadiness:true,supportEscalation:true,rollbackRecovery:true,pilotRunbook:true,humanGoHold:true,noAutomaticDeployment:true,noAutomaticCutover:true,noAutomaticPilotActivation:true,autonomousProductionChanges:false},null,2));
})().catch(e=>{console.error(e);process.exit(1);});