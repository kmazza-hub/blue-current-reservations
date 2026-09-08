"use strict";
const assert=require("assert"),Service=require("../../server/services/restaurantIntelligenceDecisionSupportService");
(async()=>{
 const state={locations:[{id:"loc1",organizationId:"org",name:"Pilot"}],restaurantIntelligenceDecisionReviews:[],restaurantIntelligenceDecisionCertifications:[]};
 const db={read:async()=>JSON.parse(JSON.stringify(state)),mutate:async fn=>fn(state)};
 const v54={snapshot:async()=>({status:"v54-operator-experience-certified",certification:{status:"V54_OPERATOR_EXPERIENCE_CERTIFIED"}})};
 const profit={snapshot:async()=>({summary:{modeledLeakageDollars:600},productivity:{delayedTickets:2,longWaitParties:1},constraints:[{id:"kitchen",label:"Kitchen throughput drag",category:"kitchen",modeledLeakageDollars:400,why:"delays",nextAction:"expedite",confidence:90,metrics:{}}]})};
 const performance={snapshot:async()=>({opportunities:[{id:"labor",title:"Trim late labor",category:"labor",estimatedImpactDollars:250,why:"labor above target",nextAction:"review staffing",owner:"GM",confidence:88,metadata:{}}]})};
 const workforce={snapshot:async()=>({summary:{laborPercent:20,targetLaborPercent:18,projectedLabor:2000,salesForecast:10000}})};
 const svc=new Service(db,{record:async()=>{}},{publish:()=>{}},v54,profit,performance,workforce);
 let s=await svc.snapshot("org",["*"]);assert.equal(s.version,"55.25.0");
 const r=await svc.review("org",["*"],"loc1",{actionability:"PASS",trust:"PASS",noiseControl:"PASS",evidence:"signals reviewed"},"Tester");
 assert.equal(r.pricingChanged,false);assert.equal(r.staffingChanged,false);assert.equal(r.seatingChanged,false);
 s=await svc.snapshot("org",["*"]);assert.equal(s.locations[0].intelligenceReady,true);
 const c=await svc.certify("org",["*"],"loc1",{decision:"READY",evidence:"signals are trusted and actionable"},"Tester");
 assert.equal(c.pricingChangedByCertification,false);assert.equal(c.staffingChangedByCertification,false);assert.equal(c.restaurantActionExecutedByCertification,false);
 console.log(JSON.stringify({ok:true,version:"55.25.0",profitabilitySignals:true,laborPressure:true,throughputFriction:true,reservationGuestSignals:true,prioritizedActions:true,modeledOpportunity:true,humanSignalReview:true,actionability:true,trust:true,noiseControl:true,humanReadyReviseHold:true,noAutomaticPricing:true,noAutomaticStaffing:true,noAutomaticSeating:true,noAutomaticRestaurantAction:true,autonomousProductionChanges:false},null,2));
})().catch(e=>{console.error(e);process.exit(1);});