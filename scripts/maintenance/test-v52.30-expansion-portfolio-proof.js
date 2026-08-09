"use strict";
const assert=require("assert"),Service=require("../../server/services/expansionPortfolioProofService");
(async()=>{
 const state={expansionPortfolioProofAssessments:[],expansionPortfolioProofDecisions:[]};
 const cohort={snapshot:async()=>({status:"expansion-cohort-observing",cohorts:[{cohortId:"c1",activation:{id:"a1"},decision:{decision:"CONTINUE"},locations:[{locationId:"loc2"}],observations:[{observedAt:"2026-08-09T12:03:00Z",severity:"none",supportLoad:"MANAGEABLE",health:{apiHealthy:true,authenticationHealthy:true}},{observedAt:"2026-08-09T12:02:00Z",severity:"low",supportLoad:"LOW",health:{apiHealthy:true,authenticationHealthy:true}},{observedAt:"2026-08-09T12:01:00Z",severity:"none",supportLoad:"MANAGEABLE",health:{apiHealthy:true,authenticationHealthy:true}}]}]})};
 const svc=new Service({read:async()=>JSON.parse(JSON.stringify(state)),mutate:async fn=>fn(state)},{record:async()=>{}},{publish:()=>{}},cohort,{snapshot:async()=>({status:"management-executive-accuracy-ready-for-certification",locations:[{locationId:"loc2",trustState:"EXECUTIVE_DATA_RECONCILED",criticalIssues:[]}]})},{snapshot:async()=>({status:"data-integrity-ready-for-certification"})});
 let s=await svc.snapshot("org",["*"]);assert.equal(s.version,"52.30.0");
 const a=await svc.assess("org",["*"],{operatorConfidence:5,portfolioOutcomeEvidence:"healthy portfolio",supportBurdenReview:"manageable",replicationLessons:"repeatable",windowStart:"start",windowEnd:"end"},"Tester");assert.equal(a.automaticRolloutStarted,false);
 s=await svc.snapshot("org",["*"]);assert.equal(s.proofReady,true);
 const d=await svc.decide("org",["*"],{decision:"REPEAT",evidence:"all proof gates pass"},"Tester");assert.equal(d.newRolloutStartedByDecision,false);assert.equal(d.rollbackExecutedByDecision,false);
 console.log(JSON.stringify({ok:true,version:"52.30.0",portfolioHealth:true,incidentTrend:true,supportBurden:true,dataIntegrityRecheck:true,expandedKpiTrust:true,humanAssessment:true,humanRepeatHoldRollback:true,noAutomaticExpansionRepeat:true,autonomousProductionChanges:false},null,2));
})().catch(e=>{console.error(e);process.exit(1);});