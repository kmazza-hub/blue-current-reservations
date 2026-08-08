"use strict";
const assert=require("assert"),path=require("path"),fs=require("fs");
const Impact=require("../../server/services/repositoryImpactService");
const Assurance=require("../../server/services/retirementAssuranceService");
const Certification=require("../../server/services/v46ReleaseCertificationService");

const root=path.resolve(__dirname,"../..");
const impact=new Impact(root),assurance=new Assurance(root,impact),cert=new Certification(root,assurance);
const snap=cert.snapshot();

assert.equal(snap.version,"46.70.0");
assert.equal(snap.packageVersion,"46.70.0");
assert.equal(snap.certified,true);
assert.equal(snap.status,"v46-release-certified");
assert.equal(snap.score,100);
assert.equal(snap.audits.app.undefinedExports,0);
assert.equal(snap.audits.scripts.missing.length,0);
assert.equal(snap.audits.navigation.desktop.duplicates.length,0);
assert.equal(snap.audits.navigation.mobile.duplicates.length,0);
assert.equal(snap.audits.retirement.trusted,true);
assert.equal(snap.audits.retirement.regressions,0);
assert.equal(snap.audits.preview.pass,true);
assert.equal(snap.audits.database.pass,true);
assert.equal(snap.audits.scaffolding.reviewUnused,0);
assert.equal(snap.safety.automaticDeletion,false);
assert.equal(snap.safety.liveExecutionChanged,false);
assert.equal(snap.digest.length,64);

// Ensure the first authoritative retirement remains closed.
for(const rel of ["client/js/modules/enterpriseValuePlanCenter.js","client/js/modules/enterpriseValuePlanEngine.js"])
  assert.equal(fs.existsSync(path.join(root,rel)),false,`${rel} was unexpectedly restored`);

console.log(JSON.stringify({
  ok:true,
  version:snap.version,
  status:snap.status,
  score:snap.score,
  undefinedModuleExports:snap.audits.app.undefinedExports,
  missingScripts:snap.audits.scripts.missing.length,
  desktopNavDuplicates:snap.audits.navigation.desktop.duplicates.length,
  mobileNavDuplicates:snap.audits.navigation.mobile.duplicates.length,
  retirementsAssured:`${snap.audits.retirement.assured}/${snap.audits.retirement.retirements}`,
  retirementRegressions:snap.audits.retirement.regressions,
  previewSafety:snap.audits.preview.pass,
  databaseResilience:snap.audits.database.pass,
  unusedV46Scaffolding:snap.audits.scaffolding.reviewUnused,
  certificationDigest:snap.digest.slice(0,12),
  automaticDeletion:false,
  v46Closed:true
},null,2));
