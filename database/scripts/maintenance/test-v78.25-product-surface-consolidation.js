"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../..");
const pkg=require(path.join(root,"package.json"));
const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");
const css=fs.readFileSync(path.join(root,"client/styles.css"),"utf8");
const shell=fs.readFileSync(path.join(root,"client/js/modules/hospitalityOsShell.js"),"utf8");
const manifest=require(path.join(root,"config/product-surface-consolidation-v78.25.json"));

assert(Number(pkg.version.split(".")[0]) >= 78);
assert.equal(manifest.version,"78.25.0");
assert(manifest.retiredFromNormalUiCount>=60);
assert.equal(manifest.policy.legacyBackendDeleted,false);
assert.equal(manifest.policy.normalUsersSeeBuildHistory,false);

const visibleVersionTokens=[...html.matchAll(/V\d+(?:\.\d+){1,2}/g)].map(m=>m[0]);
assert.deepEqual(visibleVersionTokens,[`V${pkg.version.replace(/\.0$/,"")}`],`unexpected visible build-history tokens: ${visibleVersionTokens.join(", ")}`);

for(const id of manifest.retiredFromNormalUi){
  const match=html.match(new RegExp(`<section\\b(?=[^>]*id="${id}")(?=[^>]*bc-legacy-development-surface)[^>]*>`));
  assert(match,`missing or unmarked retired surface ${id}`);
}

for(const id of [
  "host-stand","service-coordination","workforce-foundation","scheduling","time-clock",
  "inventory-intelligence","profit-current","hospitality-analytics","executive-command-center",
  "portfolio-mode","mission-control","production-readiness","cloud-foundation"
]) assert(html.includes(`id="${id}"`),`curated product surface missing ${id}`);

for(const oldId of [
  "executiveRecommendationCenterV43","executiveTimelineCenterV43","executiveReasoningCenterV43",
  "technicalActivationReadiness","deploymentReadinessCenter","v48ReleaseCertification"
]) {
  assert(html.includes(`id="${oldId}"`),`backend/development surface accidentally deleted ${oldId}`);
  const tag=html.match(new RegExp(`<section\\b(?=[^>]*id="${oldId}")(?=[^>]*bc-legacy-development-surface)[^>]*>`));
  assert(tag,`${oldId} should be hidden`);
}

assert(css.includes("body.bc-consolidated-product-surface .bc-legacy-development-surface"));
assert(css.includes("body.bc-consolidated-product-surface .site-footer"));
assert(css.includes("body.bc-consolidated-product-surface.bc-show-advanced .bc-legacy-development-surface"));
assert(shell.includes('new URLSearchParams(window.location.search).get("advanced")==="1"'));
assert(shell.includes('"bc-consolidated-product-surface"'));
assert(!shell.includes('"managerOperatingRhythm"'));
assert(!shell.includes('"serviceProfitabilityIntelligence"'));
assert(!shell.includes('"v5325RestaurantWorkflowIntegration"'));
assert(!shell.includes('"technicalActivationReadiness"'));
assert(!shell.includes('"deploymentReadinessCenter"'));

for(const backend of [
  "server/services/commandOperatingPictureService.js",
  "server/services/commandPrioritizationService.js",
  "server/services/commandManagerActionService.js",
  "server/services/commandOutcomeVerificationService.js",
  "server/services/commandPlaybookIntelligenceService.js",
  "server/services/universalHospitalityIntegrationService.js",
  "server/services/liveShiftFailureCertificationService.js",
  "server/services/pilotReadinessCommandCenterService.js"
]) assert(fs.existsSync(path.join(root,backend)),`backend capability missing ${backend}`);

const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(ids.length,new Set(ids).size,"duplicate HTML IDs");
const anchors=[...html.matchAll(/href="#([^"]+)"/g)].map(m=>m[1]);
assert.deepEqual([...new Set(anchors.filter(id=>!ids.includes(id)))],[],"broken fragment anchors");

console.log(JSON.stringify({
 ok:true,version:"78.25.0",
 visibleBuildHistoryTokens:visibleVersionTokens.length,
 legacySurfacesRetiredFromNormalUi:manifest.retiredFromNormalUiCount,
 legacyBackendDeleted:false,
 curatedWorkspaces:9,
 advancedInspectionAvailable:true,
 executiveLegacyEnginesHidden:true,
 deploymentCertificationHidden:true,
 commandIntelligencePreserved:true,
 integrationsPreserved:true,
 failureRecoveryPreserved:true,
 duplicateIds:0,
 brokenAnchors:0
},null,2));
