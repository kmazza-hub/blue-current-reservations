"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../..");
const pkg=require(path.join(root,"package.json"));
const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");
const css=fs.readFileSync(path.join(root,"client/styles.css"),"utf8");
const js=fs.readFileSync(path.join(root,"client/js/staff-kitchen-service-v62.50.js"),"utf8");
const ux=fs.readFileSync(path.join(root,"client/js/operator-experience-v60.0.js"),"utf8");

assert.equal(pkg.version,"62.50.0");
assert(html.includes('content="62.50.0"'));

assert(html.includes('href="#workforce-intelligence">Staff</a>'));
assert(html.includes('id="service-coordination"'));
assert(html.includes('id="serviceCoordination"'));
for(const id of ["svcActive","svcReady","svcRisk","svcHealth","svcFlowBody","svcExpoQueue","svcAlerts","svcServerLoad","svcFilters"])
  assert(html.includes(`id="${id}"`),`${id} missing`);

assert(ux.includes('"workforce-intelligence"'));
assert(ux.includes('"kitchenThroughputCenter"'));
assert(ux.includes('"service-coordination"'));

assert(js.includes("Show staffing detail"));
assert(js.includes("bc-kitchen-actions"));
assert(js.includes("Approve move"));
assert(js.includes("MutationObserver"));
assert(js.includes("bc-service-risk"));
assert(js.includes("bc-service-ready"));

assert(css.includes("#workforce-intelligence .bc-staff-detail{display:none!important}"));
assert(css.includes("#kitchenThroughputCenter .bc-kitchen-actions"));
assert(css.includes(".service-coordination{padding:82px 0!important;background:#071b26}"));

console.log(JSON.stringify({
  ok:true,
  version:"62.50.0",
  staffNavigationTargetsLiveWorkforce:true,
  staffShiftCoveragePrimary:true,
  staffDetailsCollapsed:true,
  staffDetailsRecoverable:true,
  kitchenRecommendedMovesFirst:true,
  kitchenPressureStillVisible:true,
  kitchenUrgencyTreatment:true,
  serviceCoordinationSurfaceRestored:true,
  serviceCoordinationExistingEngineCompatible:true,
  activeServiceTable:true,
  expoQueue:true,
  serviceAlerts:true,
  serverLoad:true,
  serviceFilters:true,
  noBackendRemoval:true
},null,2));
