"use strict";
const assert=require("assert"),Service=require("../../server/services/v55DecisionValueCertificationService");
(async()=>{
 const state={v55DecisionValueReviews:[],v55DecisionValueCertifications:[]};
 const db={read:async()=>JSON.parse(JSON.stringify(state)),mutate:async fn=>fn(state)};
 const intelligence={snapshot:async()=>({status:"restaurant-intelligence-ready",locations:[{intelligenceReady:true,certification:{decision:"READY"}}]})};
 const value={snapshot:async()=>({status:"profitability-accountability-ready",portfolio:{modeledCurrentOpportunityDollars:300,modeledBaselineDollars:650,modeledRealizedValueDollars:350,openInterventions:0,measuredInterventions:2},locations:[{valueReady:true,certification:{decision:"READY"}}]})};
 const svc=new Service(db,{record:async()=>{}},{publish:()=>{}},intelligence,value);
 let s=await svc.snapshot("org",["*"]);assert.equal(s.version,"56.0.0");
 const r=await svc.review("org",["*"],{signalTrust:"PASS",actionability:"PASS",valueTraceability:"PASS",modeledValueDisclosure:"PASS",operatorAcceptance:"accepted",managerAcceptance:"accepted",executiveReporting:"PASS",v56Entry:"APPROVED"},"Tester");
 assert.equal(r.pricingChanged,false);assert.equal(r.staffingChanged,false);assert.equal(r.scheduleChanged,false);assert.equal(r.restaurantActionExecuted,false);
 s=await svc.snapshot("org",["*"]);assert.equal(s.closureReady,true);assert.equal(s.portfolio.modeledRealizedValueDollars,350);
 const c=await svc.certify("org",["*"],{evidence:"V55 decision-value gates pass",acceptance:"approved for V56"},"Tester");
 assert.equal(c.pricingChangedByCertification,false);assert.equal(c.staffingChangedByCertification,false);assert.equal(c.scheduleChangedByCertification,false);assert.equal(c.restaurantActionExecutedByCertification,false);
 console.log(JSON.stringify({ok:true,version:"56.0.0",restaurantIntelligence:true,profitabilityAccountability:true,signalTrust:true,actionability:true,valueTraceability:true,modeledValueDisclosure:true,operatorAcceptance:true,managerAcceptance:true,executiveReporting:true,v56Entry:true,humanCertification:true,noAutomaticPricing:true,noAutomaticStaffing:true,noAutomaticScheduling:true,noAutomaticRestaurantAction:true,autonomousProductionChanges:false},null,2));
})().catch(e=>{console.error(e);process.exit(1);});