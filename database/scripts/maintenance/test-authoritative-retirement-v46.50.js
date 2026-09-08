"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
const Impact=require("../../server/services/repositoryImpactService");
const root=path.resolve(__dirname,"../.."),surface="enterpriseValuePlanCenter";
const retired=[
  "client/js/modules/enterpriseValuePlanCenter.js",
  "client/js/modules/enterpriseValuePlanEngine.js"
];
for(const rel of retired)assert.equal(fs.existsSync(path.join(root,rel)),false,`${rel} should be retired`);
const runtime=[
  "client/index.html","client/js/app-v15.1.3.js","client/app-v15.1.3.js","app-v15.1.3.js",
  "client/js/modules/operatorConsolidationEngine.js"
];
for(const rel of runtime){
  const text=fs.readFileSync(path.join(root,rel),"utf8");
  assert.equal(text.includes(surface),false,`${rel} retains ${surface}`);
  assert.equal(text.includes("enterpriseValuePlanEngine.js"),false,`${rel} retains retired engine script`);
  assert.equal(text.includes("enterpriseValuePlanCenter.js"),false,`${rel} retains retired center script`);
}
const impact=new Impact(root).analyze(surface);
assert.equal(impact.graph.ownedFiles.length,0);
assert.equal(impact.graph.startupDependencies.length,0);
assert.equal(impact.graph.apiUsage.length,0);
assert.equal(impact.graph.inboundReferences.some(x=>["reference","startup-registry","html-registration"].includes(x.type)),false);
const ledger=JSON.parse(fs.readFileSync(path.join(root,"config/retirements/V46.50.0-enterpriseValuePlanCenter.json"),"utf8"));
assert.equal(ledger.status,"authoritatively-retired");
assert.equal(ledger.rollbackAvailable,true);
assert.equal(ledger.retiredFiles.length,2);
console.log(JSON.stringify({ok:true,version:"46.50.0",surface,retiredFiles:retired.length,ownedFiles:impact.graph.ownedFiles.length,startupDependencies:impact.graph.startupDependencies.length,apiReferences:impact.graph.apiUsage.length,operationalInboundReferences:impact.graph.inboundReferences.filter(x=>["reference","startup-registry","html-registration"].includes(x.type)).length,rollbackAvailable:ledger.rollbackAvailable,status:ledger.status},null,2));
