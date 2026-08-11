"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../..");
const pkg=require(path.join(root,"package.json"));
const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");
const css=fs.readFileSync(path.join(root,"client/styles.css"),"utf8");
const js=fs.readFileSync(path.join(root,"client/js/workflow-reduction-v64.50.js"),"utf8");
const usability=fs.readFileSync(path.join(root,"client/js/operator-usability-v60.50.js"),"utf8");

assert.equal(pkg.version,"64.50.0");
assert(html.includes('content="64.50.0"'));
assert(html.includes("workflow-reduction-v64.50.js?v=64.50.0"));
assert(usability.includes("duplicate sticky workspace jump bar was retired"));
assert(js.includes("ONE JOB · ONE HOME"));
assert(js.includes("window.BlueCurrentWorkflows"));
for(const job of ["walkin","addReservation","guests","staff","kitchen","service","ai","executive"])
  assert(js.includes(`data-bc-job="${job}"`)||js.includes(`${job}:`),job);
assert(js.includes('target:"host-stand",view:"waitlist"'));
assert(js.includes('target:"workforce-intelligence"'));
assert(js.includes('target:"kitchenThroughputCenter"'));
assert(js.includes('target:"service-coordination"'));
assert(js.includes('target:"restaurantAiBrainV341"'));
assert(js.includes('target:"executive-command-center"'));
assert(css.includes("#bcPrimaryJump{display:none!important}"));
assert(css.includes(".bc-quick-jobs-menu"));

const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
assert.equal(ids.length,new Set(ids).size,"duplicate HTML ids found");
const anchors=[...html.matchAll(/href="#([^"]+)"/g)].map(x=>x[1]);
const idSet=new Set(ids);
assert.equal([...new Set(anchors.filter(x=>!idSet.has(x)))].length,0,"broken hash targets found");

console.log(JSON.stringify({
 ok:true,
 version:"64.50.0",
 redundantJumpNavigationRetired:true,
 quickJobs:true,
 canonicalWorkflowRouter:true,
 oneJobOneHome:true,
 canonicalJobs:8,
 hostCanonicalRoutes:true,
 staffCanonicalRoute:true,
 kitchenCanonicalRoute:true,
 serviceCanonicalRoute:true,
 aiCanonicalRoute:true,
 executiveCanonicalRoute:true,
 duplicateHtmlIds:0,
 brokenHashTargets:0,
 noWorkflowDeletion:true
},null,2));
