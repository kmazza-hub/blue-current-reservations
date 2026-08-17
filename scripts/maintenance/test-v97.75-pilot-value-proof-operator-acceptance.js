"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path"),root=path.resolve(__dirname,"../.."),pkg=require(path.join(root,"package.json"));assert.equal(pkg.version,"97.75.0");
const s=fs.readFileSync(path.join(root,"server/services/pilotValueProofOperatorAcceptanceService.js"),"utf8");
for(const id of["OUTCOME_MEASUREMENT_READY","OPERATOR_ACCEPTANCE_RECORDED","OPERATOR_VALUE_ACCEPTED","OPERATOR_FRICTION_REVIEWED","GUEST_IMPACT_REVIEWED","WORKFLOW_IMPACT_REVIEWED","RELIABILITY_CONFIDENCE_RECORDED","MEASURABLE_VALUE_EVIDENCE"])assert(s.includes(`id:"${id}"`),id);
for(const x of["operatorAcceptanceHumanRecorded:true","valueNarrativeHumanAuthored:true","reliabilityConfidenceHumanRated:true","measuredTrendIsEvidenceNotCausation:true","noAutomaticValueClaim:true","noAutomaticExpansion:true","noAutomaticCommercialization:true","autonomousProductionChanges:false"])assert(s.includes(x),x);
for(const x of["ACCEPTED","HOLD","REJECTED","HIGH","MEDIUM","LOW"])assert(s.includes(`"${x}"`),x);
const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8");assert(router.includes("/api/pilot/value-proof-acceptance"));
console.log(JSON.stringify({ok:true,version:"97.75.0",valueProofChecks:8,operatorDecisionStates:3,reliabilityConfidenceLevels:3,humanOperatorAcceptance:true,humanValueNarrative:true,noAutomaticValueClaim:true,noAutomaticExpansion:true,noAutomaticCommercialization:true,nextGate:"PILOT_LEARNING_TO_PRODUCT_DECISION_CONTROL"},null,2));
