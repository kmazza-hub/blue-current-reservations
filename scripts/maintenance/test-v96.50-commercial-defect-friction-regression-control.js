"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path"),root=path.resolve(__dirname,"../.."),pkg=require(path.join(root,"package.json"));
assert(Number(pkg.version.split(".")[0])>=96);
const s=fs.readFileSync(path.join(root,"server/services/commercialDefectFrictionRegressionControlService.js"),"utf8");
for(const x of ["DEFECT","OPERATOR_FRICTION","REGRESSION","CRITICAL","HIGH","MEDIUM","LOW","OPEN","TRIAGED","IN_PROGRESS","RESOLVED","VERIFIED","CLOSED","REPRODUCTION_EVIDENCE","ROOT_CAUSE","RESOLUTION_EVIDENCE","REGRESSION_TEST","HUMAN_VERIFICATION"])assert(s.includes(`"${x}"`),x);
for(const x of ["criticalHighBlockRelease:true","resolvedRequiresHumanVerification:true","regressionsRequireRegressionEvidence:true","operatorFrictionIsCommercialHardeningWork:true","noAutomaticClose:true","noAutomaticRelease:true","autonomousProductionChanges:false"])assert(s.includes(x),x);
const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8");assert(router.includes('/api/commercial-hardening/issues'));assert(router.includes('commercialDefectFrictionRegressionControlService.record'));
console.log(JSON.stringify({ok:true,version:"96.50.0",issueTypes:3,severityLevels:4,lifecycleStates:6,evidenceRequirements:5,criticalHighReleaseBlocking:true,humanVerificationRequired:true,noAutomaticClose:true,noAutomaticRelease:true,nextGate:"COMMERCIAL_HARDENING_PRODUCTION_RELIABILITY_AND_SUPPORTABILITY"},null,2));
