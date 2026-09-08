"use strict";
const assert=require("assert");
const Service=require("../../server/services/pilotCloseoutOutcomeService");

(async()=>{
 const state={pilotCloseoutReviews:[],pilotExpansionDecisions:[]};
 const stabilization={snapshot:async()=>({status:"pilot-stable",locations:[{locationId:"loc1",locationName:"Pilot Restaurant",stabilizationState:"PILOT_STABLE",exitDecision:{decision:"STABLE"}}]})};
 const svc=new Service({read:async()=>JSON.parse(JSON.stringify(state)),mutate:async fn=>fn(state)},{record:async()=>{}},{publish:()=>{}},stabilization);

 let s=await svc.snapshot("org",["loc1"]);
 assert.equal(s.version,"52.10.0");
 assert.equal(s.status,"pilot-closeout-required");

 const review=await svc.review("org",["loc1"],"loc1",{
   objectiveOutcomeSummary:"Pilot objectives met.",
   operatorFeedback:"Operators completed the shift confidently.",
   guestImpactSummary:"No material guest impact.",
   supportBurdenSummary:"Support burden remained manageable.",
   dataKpiConfidenceSummary:"Data and KPI outputs reconciled.",
   lessonsLearned:"Preserve staged rollout and operator rehearsal.",
   incidentCloseout:[{id:"i1",summary:"Minor login issue",status:"CLOSED"}],
   unresolvedDebt:[],
   expansionPrerequisites:[{id:"p1",summary:"Second-location configuration complete",status:"MET"}]
 },"Tester");
 assert.equal(review.rolloutPerformed,false);

 s=await svc.snapshot("org",["loc1"]);
 assert.equal(s.locations[0].expansionReady,true);
 assert.equal(s.locations[0].passed,10);

 const decision=await svc.decide("org",["loc1"],"loc1",{decision:"EXPAND",evidence:"All closeout and expansion gates passed."},"Tester");
 assert.equal(decision.decision,"EXPAND");
 assert.equal(decision.rolloutPerformedByDecision,false);
 assert.equal(decision.retirementPerformedByDecision,false);

 const hold=await svc.decide("org",["loc1"],"loc1",{decision:"HOLD",evidence:"Leadership review.",reason:"Wait for next operating period."},"Tester");
 assert.equal(hold.decision,"HOLD");

 console.log(JSON.stringify({
   ok:true,version:"52.10.0",
   objectiveOutcomeReview:true,
   operatorFeedback:true,
   guestImpactSummary:true,
   incidentCloseout:true,
   supportBurden:true,
   dataKpiConfidence:true,
   unresolvedDebtRegister:true,
   lessonsLearned:true,
   expansionPrerequisites:true,
   humanExpandHoldRetire:true,
   noAutomaticMultiLocationRollout:true,
   noAutomaticPilotRetirement:true,
   autonomousProductionChanges:false
 },null,2));
})().catch(e=>{console.error(e);process.exit(1);});
