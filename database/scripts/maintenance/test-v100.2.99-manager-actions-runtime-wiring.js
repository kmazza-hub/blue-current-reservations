"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../.."),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const server=read("server/server.js"),router=read("server/api/router.js"),manager=read("client/js/manager-operations-truth-v100.2.68.js");
const ActionListService=require(path.join(root,"server/services/actionListService.js"));

class MemoryDatabase{
  constructor(){this.data={staff:[],employees:[],ptoRequests:[],inventoryItems:[],maintenanceTickets:[],shiftHandoffs:[],managerActions:[]};}
  async read(){return this.data;}
  async mutate(fn){return fn(this.data);}
  async list(name,predicate){return (this.data[name]||[]).filter(predicate);}
}

(async()=>{
  const checks=[
    ["server imports ActionListService",/const ActionListService = require\("\.\/services\/actionListService"\);/.test(server)],
    ["server creates one action list service",/const actionListService = new ActionListService\(database, operationsFeedService\);/.test(server)],
    ["action service reuses Operations Feed",server.indexOf("new ActionListService(database, operationsFeedService)")>server.indexOf("new OperationsFeedService(database)")],
    ["router receives actionListService",/createRouter\(\{[^\n]*operationsFeedService, actionListService, liveIntegrationService/.test(server)],
    ["GET Manager Actions uses injected service",/await actionListService\.list\(organizationId, locationId\)/.test(router)],
    ["POST Manager Actions uses injected service",/await actionListService\.create\(organizationId, locationId, body, auth\.user\)/.test(router)],
    ["Manager screen remains live-API backed",/api\.managerActions\(LOCATION_ID\)/.test(manager)],
    ["no fallback Manager queue added",!/localStorage/.test(manager)]
  ];
  const database=new MemoryDatabase(),service=new ActionListService(database,{record:async()=>null});
  const result=await service.list("org_test","loc_test");
  checks.push(["wired service executes against persistence",Array.isArray(result.actions)]);
  checks.push(["automatic operating action synchronizes",result.actions.some(x=>x.id==="action_loc_test_shift_handoff"&&x.automatic===true)]);
  let passed=0;for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(ok)passed++;}
  console.log(`V100.2.99 validation ${passed}/${checks.length}`);assert.equal(passed,checks.length);
})().catch(error=>{console.error(error);process.exit(1);});
