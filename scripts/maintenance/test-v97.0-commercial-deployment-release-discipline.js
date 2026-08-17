"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path"),root=path.resolve(__dirname,"../.."),pkg=require(path.join(root,"package.json"));assert(Number(pkg.version.split(".")[0])>=97);
const s=fs.readFileSync(path.join(root,"server/services/commercialDeploymentReleaseDisciplineService.js"),"utf8");
for(const id of["SUPPORTABILITY_CLEAR","IMMUTABLE_BUILD_ID","CHANGE_FREEZE_ACKNOWLEDGED","PREDEPLOY_BACKUP_EVIDENCE","ROLLBACK_PLAN_EVIDENCE","DEPLOYMENT_PLAN_EVIDENCE","POSTDEPLOY_VERIFICATION_PLAN","HUMAN_RELEASE_APPROVAL"])assert(s.includes(`id:"${id}"`),id);
for(const x of["immutableBuildIdentityRequired:true","changeFreezeRequired:true","preDeployBackupRequired:true","rollbackEvidenceRequired:true","postDeployVerificationRequired:true","humanReleaseApprovalRequired:true","approvalDoesNotDeploy:true","noAutomaticDeployment:true","noAutomaticRollback:true","autonomousProductionChanges:false"])assert(s.includes(x),x);
console.log(JSON.stringify({ok:true,version:"97.0.0",releaseChecks:8,humanApproval:true,approvalDoesNotDeploy:true,noAutomaticDeployment:true,noAutomaticRollback:true,nextGate:"LIVE_PILOT_EXECUTION_AND_FIELD_EVIDENCE"},null,2));
