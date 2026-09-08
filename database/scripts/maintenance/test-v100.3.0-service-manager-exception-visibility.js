"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../.."),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const actionsSource=read("server/services/actionListService.js"),router=read("server/api/router.js"),api=read("client/js/cloud/cloudApi.js"),floor=read("client/js/floor-reservations-v62.0.js"),manager=read("client/js/manager-operations-truth-v100.2.68.js"),server=read("server/server.js");
const ActionListService=require(path.join(root,"server/services/actionListService.js"));

class MemoryDatabase{
  constructor(){this.data={staff:[],employees:[],ptoRequests:[],inventoryItems:[],maintenanceTickets:[],shiftHandoffs:[],managerActions:[]};}
  async read(){return this.data;}
  async mutate(fn){return fn(this.data);}
  async list(name,predicate){return (this.data[name]||[]).filter(predicate);}
  async get(name,id){return (this.data[name]||[]).find(x=>x.id===id)||null;}
  async update(name,id,changes){const row=await this.get(name,id);if(!row)return null;Object.assign(row,changes);return row;}
}

(async()=>{
  const events=[],database=new MemoryDatabase(),service=new ActionListService(database,{record:async event=>{events.push(event);return event;}});
  const exception={exceptionKey:"alex|4|table_12|seated",guest:"Alex",table:"Table 12",status:"seated",minutes:5,reason:"Still waiting for a greeting",action:"Greet this table now"};
  const opened=await service.synchronizeServiceExceptions("org_a","loc_a",{exceptions:[exception]},{name:"Server A"});
  const first=database.data.managerActions[0];
  assert.equal(opened.transitions,1);assert.equal(first.automatic,true);assert.equal(first.priority,"high");assert.equal(first.sourceRecordType,"service_exception");
  assert(!first.id.includes("alex"));assert.equal(events.length,1);
  const repeated=await service.synchronizeServiceExceptions("org_a","loc_a",{exceptions:[{...exception,minutes:6}]},{name:"Server A"});
  assert.equal(repeated.transitions,0);assert.equal(database.data.managerActions.length,1);assert.equal(first.serviceContext.minutes,6);assert.equal(events.length,1);
  const managerList=await service.list("org_a","loc_a");assert.equal(managerList.actions[0].completed,false);
  await service.update("org_a","loc_a",first.id,{completed:true},{name:"Manager A"});
  await service.synchronizeServiceExceptions("org_a","loc_a",{exceptions:[{...exception,minutes:7}]},{name:"Server A"});
  assert.equal(first.completed,true);assert.equal(first.completedBy,"Manager A");
  const second={...exception,exceptionKey:"sam|2|table_14|ordering",guest:"Sam",table:"Table 14",status:"ordering"};
  await service.synchronizeServiceExceptions("org_a","loc_a",{exceptions:[exception,second]},{name:"Server A"});
  const secondRow=database.data.managerActions.find(x=>x.serviceContext?.guest==="Sam");assert(secondRow&&!secondRow.completed);
  const cleared=await service.synchronizeServiceExceptions("org_a","loc_a",{exceptions:[exception]},{name:"Server A"});
  assert.equal(cleared.transitions,1);assert.equal(secondRow.completed,true);assert.equal(secondRow.autoResolved,true);

  const checks=[
    ["V100.3.0 client marker",/V100\.3\.0 — Service → Manager Exception Visibility/.test(floor)],
    ["Service sends only recovery exceptions",/filter\(x=>x\.recovery\)/.test(floor)&&/serviceRecoveryException\(p\)/.test(floor)],
    ["stable party-stage identity is sent",/exceptionKey:`\$\{servicePartyKey\(party\)\}\|\$\{recovery\.status\}`/.test(floor)],
    ["client sync is authenticated and capability guarded",/serviceManagerApi\?\.token/.test(floor)&&/hasCapability\?\.\("syncServiceExceptions"\)/.test(floor)],
    ["repeated snapshots are deduplicated",/digest===serviceManagerDigest/.test(floor)],
    ["current exceptions refresh on a bounded interval",/setInterval\(\(\)=>syncServiceManagerExceptions\(readServiceParties\(\)\),30000\)/.test(floor)],
    ["Cloud API exposes specialized sync",/syncServiceExceptions\(payload\)/.test(api)&&/manager-actions\/service-exceptions/.test(api)],
    ["router enforces location access",/manager-actions\/service-exceptions[\s\S]*canAccessLocation\(locationId\)/.test(router)],
    ["server hashes exception identity",/createHash\("sha256"\)/.test(actionsSource)],
    ["server writes existing Manager Actions ledger",/db\.managerActions/.test(actionsSource)&&/sourceRecordType: "service_exception"/.test(actionsSource)],
    ["operating synchronizer cannot clear Service records",/synchronizedTypes\.has\(action\.sourceRecordType\)/.test(actionsSource)],
    ["Manager remains backed by existing action API",/api\.managerActions\(LOCATION_ID\)/.test(manager)],
    ["V100.2.99 runtime wiring remains",/new ActionListService\(database, operationsFeedService\)/.test(server)],
    ["no second client persistence store",!floor.includes("blueCurrent.service.manager")],
    ["no automatic Service milestone advancement",!/status\s*:\s*["']dining["']/.test(floor.slice(floor.indexOf("V100.3.0 — Service → Manager")))]
  ];
  let passed=0;for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(ok)passed++;}
  console.log(`V100.3.0 validation ${passed}/${checks.length}`);assert.equal(passed,checks.length);
  console.log(JSON.stringify({functional:{openedOnce:true,repeatDeduplicated:true,managerCompletionPreserved:true,clearedConditionAutoResolved:true,piiExcludedFromId:true,feedTransitionsOnly:true}},null,2));
})().catch(error=>{console.error(error);process.exit(1);});
