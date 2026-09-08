"use strict";
const assert=require("assert");
const fs=require("fs");
const path=require("path");
const root=path.resolve(__dirname,"../..");

const servicePath=path.join(root,"server/services/pilotPerformanceTrendIntelligenceService.js");
assert(fs.existsSync(servicePath),"pilotPerformanceTrendIntelligenceService.js is missing");

const Service=require(servicePath);
assert.equal(typeof Service,"function");

const server=fs.readFileSync(path.join(root,"server/server.js"),"utf8");
assert(
  server.includes('require("./services/pilotPerformanceTrendIntelligenceService")'),
  "server.js does not reference pilotPerformanceTrendIntelligenceService"
);

console.log(JSON.stringify({
  ok:true,
  hotfix:"V82 missing pilotPerformanceTrendIntelligenceService",
  servicePresent:true,
  serviceLoads:true,
  serverDependencyPresent:true
},null,2));
