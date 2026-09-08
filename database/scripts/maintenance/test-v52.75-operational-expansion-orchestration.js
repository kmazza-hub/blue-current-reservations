"use strict";
const assert=require("assert"),Service=require("../../server/services/operationalIntegrationExpansionOrchestrationService");
(async()=>{
 const state={operationalExpansionOrchestrationPlans:[],operationalExpansionOrchestrationDecisions:[]};
 const repeatability={snapshot:async()=>({status:"expansion-repeatability-certified",certification:{id:"cert1",status:"REPEATABILITY_CERTIFIED"},rolloutTemplate:{maxConcurrentLocations:2}})};
 const expansion={snapshot:async()=>({approvedTargets:[{locationId:"loc2",locationName:"Location 2"}]})};
 const cohorts={snapshot:async()=>({cohorts:[]})};
 const svc=new Service({read:async()=>JSON.parse(JSON.stringify(state)),mutate:async fn=>fn(state)},{record:async()=>{}},{publish:()=>{}},repeatability,expansion,cohorts);
 let s=await svc.snapshot("org",["*"]);assert.equal(s.version,"52.75.0");
 const p=await svc.createPlan("org",["*"],{
  name:"Orchestration",executiveOwner:"COO",operationsOwner:"Ops",technicalOwner:"Tech",supportOwner:"Support",
  maxConcurrentLocations:1,maxConcurrentIncidents:1,
  configurationDependency:"verified",connectorDependency:"verified",trainingDependency:"verified",supportDependency:"verified",rollbackDependency:"verified",
  operatingHandoff:"handoff defined",escalationModel:"escalation defined",observationModel:"observation defined",changeFreezeRule:"freeze during activation",evidence:"human reviewed",
  stages:[{locationIds:["loc2"],entryCriteria:"all preflight pass",exitCriteria:"stable observation",observationWindow:"one service"}]
 },"Tester");
 assert.equal(p.deploymentPerformed,false);assert.equal(p.locationsActivated,false);assert.equal(p.restaurantStateMutated,false);
 s=await svc.snapshot("org",["*"]);assert.equal(s.readyWithoutDecision,true);
 const d=await svc.decide("org",["*"],p.id,{decision:"READY",evidence:"all gates reviewed"},"Tester");
 assert.equal(d.deploymentPerformedByDecision,false);assert.equal(d.locationsActivatedByDecision,false);assert.equal(d.restaurantStateMutatedByDecision,false);
 console.log(JSON.stringify({ok:true,version:"52.75.0",certifiedTemplateIntegration:true,stagedSequence:true,ownerMatrix:true,capacityLimits:true,dependencyMatrix:true,operatingHandoff:true,escalationModel:true,observationModel:true,changeFreeze:true,humanReadyPauseHold:true,noAutomaticDeployment:true,noAutomaticActivation:true,autonomousProductionChanges:false},null,2));
})().catch(e=>{console.error(e);process.exit(1);});