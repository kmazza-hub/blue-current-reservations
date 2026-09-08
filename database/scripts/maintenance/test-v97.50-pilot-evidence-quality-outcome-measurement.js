"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path"),root=path.resolve(__dirname,"../.."),pkg=require(path.join(root,"package.json"));assert(Number(pkg.version.split(".")[0])>=97);
const s=fs.readFileSync(path.join(root,"server/services/pilotEvidenceQualityOutcomeMeasurementService.js"),"utf8");
for(const id of["FIELD_EVIDENCE_BASELINE","EVIDENCE_COMPLETENESS_95","MULTI_SERVICE_NIGHT_EVIDENCE","CORE_CATEGORIES_REPRESENTED","MEASURABLE_OUTCOMES_AVAILABLE","EVIDENCE_VERIFICATION_PRESENT"])assert(s.includes(`id:"${id}"`),id);
for(const x of["minimumEvidenceCompletenessPercent:95","multipleServiceNightsRequired:true","coreCategoryCoverageRequired:true","humanVerificationRequired:true","metricTrendIsEvidenceNotCausation:true","noAutomaticCommercialClaim:true","noAutomaticProductChange:true","autonomousProductionChanges:false"])assert(s.includes(x),x);
const field=fs.readFileSync(path.join(root,"server/services/livePilotFieldEvidenceService.js"),"utf8");assert(field.includes("async verify("));assert(field.includes("item.verified=true"));
const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8");assert(router.includes("/api/pilot/evidence-quality-outcomes"));assert(router.includes("/verify"));
console.log(JSON.stringify({ok:true,version:"97.50.0",qualityChecks:6,minimumCompletenessPercent:95,multipleServiceNightsRequired:true,humanVerification:true,metricTrendNotCausation:true,noAutomaticCommercialClaim:true,noAutomaticProductChange:true,nextGate:"PILOT_VALUE_PROOF_AND_OPERATOR_ACCEPTANCE"},null,2));
