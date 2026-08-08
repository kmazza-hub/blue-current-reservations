"use strict";
const assert=require("assert"),Service=require("../../server/services/v48ReleaseCertificationService");
(async()=>{
 const svc=new Service({}, {snapshot:async()=>({status:"active"})},
 {snapshot:async()=>({status:"proof-program-active"})},
 {snapshot:async()=>({status:"review-ready",packet:{evidence:{verifiedRealizedImpactDollars:1200},locationReview:[{},{}],exceptions:[]}})},
 {snapshot:async()=>({latestDecision:{decision:"EXPAND"},policy:{automaticApproval:false,automaticExpansion:false}})},
 {snapshot:async()=>({status:"plan-drafted",policy:{automaticActivation:false,automaticExpansion:false}})});
 const s=await svc.snapshot("org",["*"]);
 assert.equal(s.version,"48.30.0");assert.equal(s.status,"V48-CERTIFIED");assert.equal(s.passed,5);assert.equal(s.total,5);
 assert.equal(s.policy.automaticAttribution,false);assert.equal(s.policy.automaticApproval,false);assert.equal(s.policy.automaticExpansion,false);assert.equal(s.policy.automaticActivation,false);
 console.log(JSON.stringify({ok:true,version:s.version,status:s.status,contracts:`${s.passed}/${s.total}`,automaticAttribution:false,automaticApproval:false,automaticExpansion:false,automaticActivation:false},null,2));
})().catch(e=>{console.error(e);process.exit(1);});