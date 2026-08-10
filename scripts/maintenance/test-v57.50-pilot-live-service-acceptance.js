"use strict";
const assert=require("assert"),Service=require("../../server/services/pilotLiveServiceAcceptanceService");
(async()=>{
 const state={pilotLiveServiceAcceptanceReviews:[],pilotLiveServiceAcceptanceDecisions:[]};
 const db={read:async()=>JSON.parse(JSON.stringify(state)),mutate:async fn=>fn(state)};
 const rc={snapshot:async()=>({status:"pilot-release-candidate-certified",rcReady:true,certification:{decision:"RC_APPROVE"},releaseCandidate:{releaseVersion:"57.0.0-rc1"}})};
 const execution={snapshot:async()=>({locations:[{locationId:"loc1",locationName:"Pilot",executionState:"CONTINUE",session:{id:"s1",status:"ACTIVE"},confirmedMilestones:7,totalMilestones:7,milestones:[],latestObservation:{health:{apiHealthy:true,authenticationHealthy:true,reservationHealthy:true,floorHealthy:true,kitchenHealthy:true,supportBridgeHealthy:true}},highCriticalIncidents:0}]})};
 const value={snapshot:async()=>({status:"pilot-active",scorecard:{overall:90},evidence:{verifiedRealizedImpactDollars:500}})};
 const svc=new Service(db,{record:async()=>{}},{publish:()=>{}},rc,execution,value);
 let s=await svc.snapshot("org",["*"]);assert.equal(s.version,"57.50.0");
 const r=await svc.review("org",["*"],"loc1",{operatorAcceptance:"PASS",managerAcceptance:"PASS",guestImpact:"PASS",workflowAcceptance:"PASS",supportBurden:"PASS",dataConfidence:"PASS",kpiObservation:"service KPIs observed",incidentSummary:"no unresolved severe incidents",liveServiceEvidence:"full pilot service observed"},"Tester");
 assert.equal(r.runtimeStartedByReview,false);assert.equal(r.deploymentPerformed,false);assert.equal(r.rollbackPerformed,false);assert.equal(r.restaurantStateMutated,false);
 s=await svc.snapshot("org",["*"]);assert.equal(s.locations[0].acceptanceReady,true);
 const d=await svc.decide("org",["*"],"loc1",{decision:"ACCEPT",evidence:"all live-service acceptance gates pass"},"Tester");
 assert.equal(d.runtimeStartedByDecision,false);assert.equal(d.deploymentPerformedByDecision,false);assert.equal(d.rollbackPerformedByDecision,false);assert.equal(d.restaurantStateMutatedByDecision,false);
 console.log(JSON.stringify({ok:true,version:"57.50.0",pilotRc:true,executionSession:true,milestones:true,liveHealth:true,noSevereIncidents:true,operatorAcceptance:true,managerAcceptance:true,guestImpact:true,workflowAcceptance:true,supportBurden:true,dataConfidence:true,kpiObservation:true,incidentSummary:true,liveServiceEvidence:true,humanAcceptExtendHold:true,noAutomaticRuntimeStart:true,noAutomaticDeployment:true,noAutomaticRollback:true,noRestaurantMutation:true,autonomousProductionChanges:false},null,2));
})().catch(e=>{console.error(e);process.exit(1);});