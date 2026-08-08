"use strict";
const assert=require("assert");
const path=require("path");
const Impact=require("../../server/services/repositoryImpactService");
const Rehearsal=require("../../server/services/repositoryRetirementRehearsalService");

const root=path.resolve(__dirname,"../..");
const impact=new Impact(root),service=new Rehearsal(root,impact);
const before=service.repositoryDigest();
const result=service.rehearse("enterpriseValuePlanCenter");
const after=service.repositoryDigest();

assert.equal(result.version,"46.40.0");
assert.equal(result.mode,"disposable-copy-rehearsal");
assert.equal(result.validation.passed,true);
assert.equal(result.readiness.status,"final-change-set-ready-for-human-review");
assert.equal(result.readiness.blockers.length,0);
assert.equal(result.before.impact.startupDependencies>=1,true);
assert.equal(result.after.impact.startupDependencies,0);
assert.equal(result.after.impact.apiReferences,0);
assert.equal(result.rollback.archiveGenerated,true);
assert.equal(result.rollback.fileCount>=3,true);
assert.ok(result.rollback.digest);
assert.equal(result.changeSet.generated,true);
assert.equal(result.changeSet.changeCount>=3,true);
assert.equal(result.safety.tempCopyUsed,true);
assert.equal(result.safety.authoritativeMutation,false);
assert.equal(result.safety.authoritativeSafe,true);
assert.equal(result.safety.codeDeletionAllowed,false);
assert.equal(result.safety.deletionExecuted,false);
assert.equal(result.safety.deleteEndpointPresent,false);
assert.equal(before.sha256,after.sha256);
assert.equal(before.fileCount,after.fileCount);

console.log(JSON.stringify({
  ok:true,
  version:result.version,
  candidate:result.surfaceId,
  beforeStartupDependencies:result.before.impact.startupDependencies,
  afterStartupDependencies:result.after.impact.startupDependencies,
  validation:result.validation.passed,
  rollbackFiles:result.rollback.fileCount,
  rollbackDigest:result.rollback.digest.slice(0,12),
  simulatedChanges:result.changeSet.changeCount,
  authoritativeDigestStable:before.sha256===after.sha256,
  readiness:result.readiness.status,
  codeDeletionAllowed:false,
  deletionExecuted:false
},null,2));
