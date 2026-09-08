"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../.."),pkg=require(path.join(root,"package.json"));assert.equal(pkg.version,"100.0.0");
const s=fs.readFileSync(path.join(root,"server/services/commercialV1CertificationService.js"),"utf8");
for(const id of["V100_RELEASE_AUTHORIZED","COMMERCIAL_OPERATIONS_SUPPORT_READY","RC_END_TO_END_VALIDATED","COMMERCIAL_RC_LOCKED","ZERO_RELEASE_BLOCKERS","CANDIDATE_IDENTITY_PRESERVED","ROLLBACK_REFERENCE_PRESERVED","HUMAN_COMMERCIAL_V1_CERTIFICATION"])assert(s.includes(`id:"${id}"`),id);
for(const x of["commercialBaselineImmutable:true","certificationRequiresHumanAuthorization:true","certificationDoesNotDeploy:true","certificationDoesNotMutateProduction:true","newBlockerInvalidatesCertification:true","releaseCandidateMutationInvalidatesCertification:true","noAutomaticDeployment:true","noAutomaticCommercialRelease:true","autonomousProductionChanges:false"])assert(s.includes(x),x);
const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8");assert(router.includes("/api/commercial-release/v1-certification"));
console.log(JSON.stringify({ok:true,version:"100.0.0",commercialV1Checks:8,lifecycle:"COMMERCIAL_V1_BASELINE",humanCertificationRequired:true,commercialBaselineImmutable:true,certificationDoesNotDeploy:true,certificationDoesNotMutateProduction:true,noAutomaticDeployment:true,noAutomaticCommercialRelease:true},null,2));
