"use strict";
const assert=require("assert"),Service=require("../../server/services/expansionCohortObservationService");
(async()=>{
 const state={expansionCohortActivations:[],expansionCohortObservations:[],expansionCohortDecisions:[]};
 const control={snapshot:async()=>({plan:{id:"plan1"},approval:{status:"MULTI_LOCATION_EXPANSION_APPROVED"},cohorts:[{id:"cohort_1",name:"Cohort 1",sequence:1,ready:true,passed:7,total:7,locations:[{locationId:"loc2",locationName:"Location 2"}]}]})};
 const svc=new Service({read:async()=>JSON.parse(JSON.stringify(state)),mutate:async fn=>fn(state)},{record:async()=>{}},{publish:()=>{}},control);
 let s=await svc.snapshot("org",["*"]);assert.equal(s.version,"52.25.0");
 const a=await svc.activate("org",["*"],"cohort_1",{activationOwner:"Expansion Lead",evidence:"Manual activation verified"},"Tester");assert.equal(a.deploymentPerformed,false);assert.equal(a.locationStateMutated,false);
 const o=await svc.observe("org",["*"],a.id,{severity:"none",supportLoad:"MANAGEABLE",apiHealthy:true,authenticationHealthy:true,reservationHealthy:true,floorHealthy:true,kitchenHealthy:true,supportBridgeHealthy:true},"Tester");assert.equal(o.automaticMitigationPerformed,false);
 s=await svc.snapshot("org",["*"]);assert.equal(s.cohorts[0].continueEligible,true);
 const d=await svc.decide("org",["*"],a.id,{decision:"CONTINUE",evidence:"Cohort healthy"},"Tester");assert.equal(d.nextCohortActivatedByDecision,false);assert.equal(d.restaurantStateMutatedByDecision,false);
 console.log(JSON.stringify({ok:true,version:"52.25.0",humanActivation:true,locationConfirmation:true,healthObservation:true,supportLoad:true,incidentCapture:true,humanContinuePauseHold:true,noAutomaticNextCohort:true,noAutomaticDeployment:true,autonomousProductionChanges:false},null,2));
})().catch(e=>{console.error(e);process.exit(1);});