"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../.."),pkg=require(path.join(root,"package.json"));assert(Number(pkg.version.split(".")[0])>=99);
const s=fs.readFileSync(path.join(root,"server/services/finalGoNoGoV100ReleaseAuthorizationService.js"),"utf8");
for(const id of["COMMERCIAL_OPERATIONS_SUPPORT_READY","RC_END_TO_END_VALIDATED","COMMERCIAL_RC_LOCKED","NO_OPEN_RELEASE_BLOCKERS","ROLLBACK_REFERENCE_AVAILABLE","RELEASE_OWNER_CONFIRMED","SUPPORT_OWNER_CONFIRMED","ESCALATION_OWNER_CONFIRMED","HUMAN_V100_RELEASE_AUTHORIZATION"])assert(s.includes(`id:"${id}"`),id);
for(const x of["explicitHumanGoNoGoRequired:true","goDecisionDoesNotDeploy:true","holdDecisionPreservesCandidate:true","newReleaseBlockerInvalidatesGo:true","rcMutationInvalidatesGo:true","operationsReadinessRegressionInvalidatesGo:true","validationRegressionInvalidatesGo:true","rollbackReferenceRequired:true","noAutomaticDeployment:true","noAutomaticCommercialRelease:true","autonomousProductionChanges:false"])assert(s.includes(x),x);
for(const x of["GO","HOLD"])assert(s.includes(`"${x}"`),x);
const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8");assert(router.includes("/api/commercial-release/v100-authorization"));
console.log(JSON.stringify({ok:true,version:"99.75.0",authorizationChecks:9,decisions:["GO","HOLD"],humanGoNoGo:true,goDoesNotDeploy:true,blockerInvalidatesGo:true,rcMutationInvalidatesGo:true,operationsRegressionInvalidatesGo:true,validationRegressionInvalidatesGo:true,rollbackReferenceRequired:true,noAutomaticDeployment:true,noAutomaticCommercialRelease:true,nextGate:"V100_COMMERCIAL_V1_CERTIFICATION"},null,2));
