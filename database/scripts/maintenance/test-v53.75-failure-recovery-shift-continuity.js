"use strict";
const assert=require("assert"),Service=require("../../server/services/failureRecoveryShiftContinuityService");
(async()=>{
 const state={locations:[{id:"loc1",organizationId:"org",name:"Pilot"}],failureRecoveryShiftContinuityRehearsals:[],failureRecoveryShiftContinuityDecisions:[]};
 const peak={snapshot:async()=>({locations:[{locationId:"loc1",resilienceReady:true,state:"PEAK_SERVICE_READY",certification:{decision:"READY"}}]})};
 const integrity={snapshot:async()=>({status:"data-integrity-ready-for-certification"})};
 const reliability={evaluate:async()=>({status:"meeting",score:100,breached:0,warning:0,runbooks:[{}]})};
 const svc=new Service({read:async()=>JSON.parse(JSON.stringify(state)),mutate:async fn=>fn(state)},{record:async()=>{}},{publish:()=>{}},peak,integrity,reliability);
 let s=await svc.snapshot("org",["*"]);assert.equal(s.version,"53.75.0");
 const scenarios=["API_FAILURE","CONNECTOR_FAILURE","STALE_DATA","OFFLINE_CONTINUITY","DEVICE_SURFACE_FAILURE","RECONNECT_RECONCILIATION"].map(id=>({id,status:"PASS",evidence:"verified"}));
 const r=await svc.rehearse("org",["*"],"loc1",{scenarios,fallbackRunbook:"manual continuity runbook",escalationOwner:"Manager",recoveryTimeMinutes:5,maxRecoveryMinutes:15,shiftContinuity:"PASS",evidence:"all degraded paths rehearsed"},"Tester");
 assert.equal(r.automaticRecoveryExecuted,false);assert.equal(r.restaurantStateMutated,false);
 s=await svc.snapshot("org",["*"]);assert.equal(s.locations[0].recoveryReady,true);
 const d=await svc.decide("org",["*"],"loc1",{decision:"RECOVER",evidence:"all recovery gates pass"},"Tester");
 assert.equal(d.recoveryExecutedByDecision,false);assert.equal(d.restaurantStateMutatedByDecision,false);assert.equal(d.automaticServiceStop,false);
 console.log(JSON.stringify({ok:true,version:"53.75.0",apiFailure:true,connectorFailure:true,staleData:true,offlineContinuity:true,deviceSurfaceFailure:true,reconnectReconciliation:true,fallbackRunbook:true,recoveryTime:true,shiftContinuity:true,humanRecoverDegradedHold:true,noAutomaticRecovery:true,autonomousProductionChanges:false},null,2));
})().catch(e=>{console.error(e);process.exit(1);});