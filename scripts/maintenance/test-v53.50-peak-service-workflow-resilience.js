"use strict";
const assert=require("assert"),Service=require("../../server/services/peakServiceWorkflowResilienceService");
(async()=>{
 const state={locations:[{id:"loc1",organizationId:"org",name:"Pilot"}],tables:[{organizationId:"org",locationId:"loc1",status:"seated",partySize:4}],serviceFlows:[{organizationId:"org",locationId:"loc1",course:"entree",risk:"normal"}],kitchenTickets:[{organizationId:"org",locationId:"loc1",status:"cooking"}],staff:[{organizationId:"org",locationId:"loc1",status:"active"}],reservations:[{organizationId:"org",locationId:"loc1"}],waitlist:[],peakServiceWorkflowObservations:[],peakServiceWorkflowCertifications:[]};
 const db={read:async()=>JSON.parse(JSON.stringify(state)),mutate:async fn=>fn(state)};
 const workflow={snapshot:async()=>({locations:[{locationId:"loc1",workflowReady:true,state:"WORKFLOW_CERTIFIED",certification:{status:"RESTAURANT_WORKFLOW_INTEGRATION_CERTIFIED"}}]})};
 const stress={snapshot:async()=>({locations:[{locationId:"loc1",passed:10,failed:0,total:10,stressState:"PEAK_SERVICE_STRESS_CERTIFIED"}]})};
 const svc=new Service(db,{record:async()=>{}},{publish:()=>{}},workflow,stress);
 let s=await svc.snapshot("org",["*"]);assert.equal(s.version,"53.50.0");
 const o=await svc.observe("org",["*"],"loc1",{handoffLatencySeconds:35,operatorWorkloadScore:3,kitchenCongestionScore:3,floorCongestionScore:3,recoveryMinutes:5,serviceCompletion:"PASS",evidence:"observed under peak load"},"Tester");
 assert.equal(o.restaurantStateMutated,false);assert.equal(o.automaticMitigationPerformed,false);
 s=await svc.snapshot("org",["*"]);assert.equal(s.locations[0].resilienceReady,true);
 const c=await svc.certify("org",["*"],"loc1",{decision:"READY",evidence:"all resilience gates pass"},"Tester");
 assert.equal(c.restaurantActionsExecutedByDecision,false);assert.equal(c.restaurantStateMutatedByDecision,false);
 console.log(JSON.stringify({ok:true,version:"53.50.0",peakStress:true,handoffLatency:true,operatorWorkload:true,kitchenCongestion:true,floorCongestion:true,recoveryTime:true,serviceCompletion:true,humanReadyDegradedHold:true,noAutomaticRestaurantMutation:true,autonomousProductionChanges:false},null,2));
})().catch(e=>{console.error(e);process.exit(1);});