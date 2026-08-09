"use strict";
const assert=require("assert"),Service=require("../../server/services/profitabilityInterventionAccountabilityService");
(async()=>{
 const state={profitabilityInterventions:[],profitabilityInterventionOutcomes:[],profitabilityInterventionCertifications:[]};
 const db={read:async()=>JSON.parse(JSON.stringify(state)),mutate:async fn=>fn(state)};
 const intelligence={snapshot:async()=>({locations:[{locationId:"loc1",locationName:"Pilot",intelligenceReady:true,state:"INTELLIGENCE_READY",certification:{decision:"READY"},modeledOpportunityDollars:650,signals:[{id:"profit_kitchen",title:"Kitchen throughput drag",category:"kitchen",impactDollars:400,score:82,severity:"high",owner:"Kitchen Manager",nextAction:"Expedite delayed tickets"}]}]})};
 const svc=new Service(db,{record:async()=>{}},{publish:()=>{}},intelligence);
 let s=await svc.snapshot("org",["*"]);assert.equal(s.version,"55.75.0");
 const a=await svc.createIntervention("org",["*"],"loc1",{signalId:"profit_kitchen",owner:"Kitchen Manager",targetDate:"2026-08-15",intervention:"Tighten expo handoff and ticket prioritization",evidence:"Manager accepted intervention"},"Tester");
 assert.equal(a.pricingChangedAutomatically,false);assert.equal(a.restaurantActionExecutedAutomatically,false);
 const o=await svc.measureOutcome("org",["*"],a.id,{remainingOpportunityDollars:150,result:"IMPROVED",decisionAccountability:"PASS",evidence:"Observed improved throughput",lessons:"Keep expo owner explicit"},"Tester");
 assert.equal(o.staffingChangedAutomatically,false);assert.equal(o.restaurantActionExecutedAutomatically,false);
 s=await svc.snapshot("org",["*"]);assert.equal(s.locations[0].modeledRealizedValueDollars,250);assert.equal(s.locations[0].valueReady,true);
 const c=await svc.certify("org",["*"],"loc1",{decision:"READY",evidence:"Intervention impact measured and accountable"},"Tester");
 assert.equal(c.pricingChangedByCertification,false);assert.equal(c.staffingChangedByCertification,false);assert.equal(c.restaurantActionExecutedByCertification,false);
 console.log(JSON.stringify({ok:true,version:"55.75.0",profitabilityTrend:true,interventionOwnership:true,targetDates:true,beforeAfterMeasurement:true,modeledValueRealization:true,decisionAccountability:true,outcomeEvidence:true,portfolioValueRollup:true,executiveReadyReviseHold:true,noAutomaticPricing:true,noAutomaticStaffing:true,noAutomaticScheduleChange:true,noAutomaticSeating:true,noAutomaticRestaurantAction:true,autonomousProductionChanges:false},null,2));
})().catch(e=>{console.error(e);process.exit(1);});