"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path"),root=path.resolve(__dirname,"../.."),pkg=require(path.join(root,"package.json"));assert(Number(pkg.version.split(".")[0])>=97);
const s=fs.readFileSync(path.join(root,"server/services/livePilotFieldEvidenceService.js"),"utf8");
for(const x of["OPERATOR_FRICTION","GUEST_IMPACT","WORKFLOW_PERFORMANCE","SYSTEM_INTERVENTION","INCIDENT","RECOVERY","OPERATIONAL_OUTCOME"])assert(s.includes(`"${x}"`),x);
for(const x of["fieldEvidenceHumanObserved:true","serviceNightIdentityRequired:true","locationIdentityRequired:true","evidenceTimestampRequired:true","productionMutationFromEvidence:false","noAutomaticProductChange:true","noAutomaticReleaseDecision:true","autonomousProductionChanges:false"])assert(s.includes(x),x);
for(const id of["CONTROLLED_RELEASE_AUTHORIZED","SERVICE_NIGHT_IDENTITY_AVAILABLE","OPERATOR_FRICTION_CAPTURED","GUEST_IMPACT_CAPTURED","WORKFLOW_PERFORMANCE_CAPTURED","OPERATIONAL_OUTCOME_CAPTURED"])assert(s.includes(`id:"${id}"`),id);
const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8");assert(router.includes("/api/pilot/field-evidence"));
console.log(JSON.stringify({ok:true,version:"97.25.0",evidenceCategories:7,fieldReadinessChecks:6,humanObserved:true,serviceNightIdentity:true,locationIdentity:true,noAutomaticProductChange:true,noAutomaticReleaseDecision:true,nextGate:"PILOT_EVIDENCE_QUALITY_AND_OUTCOME_MEASUREMENT"},null,2));
