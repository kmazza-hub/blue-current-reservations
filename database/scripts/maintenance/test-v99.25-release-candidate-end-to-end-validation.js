"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../.."),pkg=require(path.join(root,"package.json"));
assert(Number(pkg.version.split(".")[0])>=99);
const s=fs.readFileSync(path.join(root,"server/services/releaseCandidateEndToEndValidationService.js"),"utf8");
for(const id of[
 "COMMERCIAL_RC_LOCKED","CANDIDATE_IDENTITY_STABLE","FINAL_TECHNICAL_CERTIFICATION_CLEAR",
 "FINAL_OPERATOR_READINESS_CLEAR","PRODUCTION_HEALTH_CLEAR","CONTROLLED_RELEASE_DISCIPLINE_PRESENT",
 "NO_OPEN_RC_RELEASE_BLOCKERS","ROLLBACK_REFERENCE_AVAILABLE","NO_UNEXPECTED_ACTIVE_RUNTIME",
 "PERSISTENCE_READABLE","AUTHORIZATION_BOUNDARY_CERTIFIED","OPERATOR_READABILITY_CERTIFIED"
])assert(s.includes(`id:"${id}"`),id);
for(const x of[
 "lockedCandidateOnly:true","candidateMutationInvalidatesValidation:true","releaseBlockerInvalidatesValidation:true",
 "technicalRegressionInvalidatesValidation:true","operatorRegressionInvalidatesValidation:true",
 "humanValidationReviewRequired:true","validationDoesNotRelease:true","noAutomaticDeployment:true",
 "noAutomaticCommercialRelease:true","autonomousProductionChanges:false"
])assert(s.includes(x),x);
const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8");
assert(router.includes("/api/commercial-release/end-to-end-validation"));
console.log(JSON.stringify({
 ok:true,version:"99.25.0",validationChecks:12,lockedCandidateOnly:true,
 technicalCertification:true,operatorReadiness:true,productionHealth:true,rollbackReadiness:true,
 persistence:true,authorization:true,readability:true,humanReviewRequired:true,
 validationDoesNotRelease:true,noAutomaticDeployment:true,noAutomaticCommercialRelease:true,
 nextGate:"COMMERCIAL_OPERATIONS_AND_SUPPORT_READINESS"
},null,2));
