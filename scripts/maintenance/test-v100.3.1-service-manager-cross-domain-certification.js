"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../.."),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const source=read("server/services/actionListService.js"),router=read("server/api/router.js"),api=read("client/js/cloud/cloudApi.js"),floor=read("client/js/floor-reservations-v62.0.js"),manager=read("client/js/manager-operations-truth-v100.2.68.js"),ownership=read("client/js/manager-action-ownership-v100.2.69.js"),followup=read("client/js/manager-action-followup-v100.2.71.js"),server=read("server/server.js");
const ActionListService=require(path.join(root,"server/services/actionListService.js"));

class MemoryDatabase{
  constructor(){this.data={staff:[],employees:[],ptoRequests:[],inventoryItems:[],maintenanceTickets:[],shiftHandoffs:[],managerActions:[]};}
  async read(){return this.data;}
  async mutate(fn){return fn(this.data);}
  async list(name,predicate){return (this.data[name]||[]).filter(predicate);}
  async get(name,id){return (this.data[name]||[]).find(x=>x.id===id)||null;}
  async update(name,id,changes){const row=await this.get(name,id);if(!row)return null;Object.assign(row,changes);return row;}
  async create(name,row){this.data[name]||=[];this.data[name].push(row);return row;}
  async delete(name,id){const row=await this.get(name,id);this.data[name]=(this.data[name]||[]).filter(x=>x.id!==id);return row;}
}

(async()=>{
  const database=new MemoryDatabase(),feed=[];
  const service=new ActionListService(database,{record:async event=>{feed.push(event);return event;}});
  const alex={exceptionKey:"alex|4|table_12|seated",guest:"Alex",table:"Table 12",status:"seated",minutes:5,reason:"Still waiting for a greeting",action:"Greet this table now"};
  const sam={exceptionKey:"sam|2|table_14|ordering",guest:"Sam",table:"Table 14",status:"ordering",minutes:24,reason:"Ordering is still open",action:"Check order progress and move service forward"};

  const first=await service.synchronizeServiceExceptions("org_a","loc_shared",{exceptions:[alex,sam]},{name:"Service A"});
  assert.deepEqual({exceptions:first.exceptions,transitions:first.transitions},{exceptions:2,transitions:2});
  const orgA=database.data.managerActions.filter(x=>x.organizationId==="org_a"&&x.sourceRecordType==="service_exception");
  assert.equal(orgA.length,2);assert.equal(new Set(orgA.map(x=>x.id)).size,2);assert(orgA.every(x=>x.priority==="high"&&x.due==="Now"&&x.automatic));

  const repeat=await service.synchronizeServiceExceptions("org_a","loc_shared",{exceptions:[{...alex,minutes:6},{...sam,minutes:25}]},{name:"Service A"});
  assert.equal(repeat.transitions,0);assert.equal(feed.length,2);assert.equal(orgA.find(x=>x.serviceContext.guest==="Sam").serviceContext.minutes,25);

  const alexAction=orgA.find(x=>x.serviceContext.guest==="Alex"),samAction=orgA.find(x=>x.serviceContext.guest==="Sam");
  await service.update("org_a","loc_shared",alexAction.id,{assign:true,assignedTo:"Maria"},{name:"Keith"});
  await service.update("org_a","loc_shared",alexAction.id,{completed:true},{name:"Maria"});
  assert.equal(alexAction.assignedTo,"Maria");assert.equal(alexAction.completedBy,"Maria");assert.equal(samAction.completed,false);
  await service.synchronizeServiceExceptions("org_a","loc_shared",{exceptions:[{...alex,minutes:7}]},{name:"Service A"});
  assert.equal(alexAction.completed,true);assert.equal(alexAction.autoResolved,false);assert.equal(samAction.completed,true);assert.equal(samAction.autoResolved,true);

  const tenant=await service.synchronizeServiceExceptions("org_b","loc_shared",{exceptions:[alex]},{name:"Service B"});
  const orgB=database.data.managerActions.find(x=>x.organizationId==="org_b"&&x.sourceRecordType==="service_exception");
  assert.equal(tenant.transitions,1);assert(orgB);assert.notEqual(orgB.id,alexAction.id);assert.equal(orgB.completed,false);assert.equal(alexAction.completed,true);
  await service.synchronizeServiceExceptions("org_a","loc_shared",{exceptions:[]},{name:"Service A"});
  assert.equal(orgB.completed,false);

  const listB=await service.list("org_b","loc_shared");
  assert(listB.actions.some(x=>x.id===orgB.id&&!x.completed));
  assert(!listB.actions.some(x=>x.organizationId==="org_a"));

  const checks=[
    ["tenant-scoped exception hash",/update\(`\$\{organizationId\}\|\$\{locationId\}\|\$\{exceptionKey\}`\)/.test(source)],
    ["raw guest identity excluded from record id",!orgB.id.toLowerCase().includes("alex")],
    ["two simultaneous exceptions remain distinct",orgA[0].id!==orgA[1].id],
    ["repeat snapshot creates no duplicate transition",repeat.transitions===0],
    ["manager assignment changes only target",alexAction.assignedTo==="Maria"&&!samAction.assignedTo],
    ["manager completion remains human owned",alexAction.completedBy==="Maria"&&alexAction.autoResolved===false],
    ["cleared open exception auto resolves",samAction.completed&&samAction.autoResolved],
    ["other tenant remains open",orgB.completed===false],
    ["list remains organization scoped",listB.actions.every(x=>x.organizationId==="org_b")],
    ["feed records transitions and manager actions",feed.some(x=>x.type==="service_exception_opened")&&feed.some(x=>x.type==="service_exception_resolved")&&feed.some(x=>x.type==="action_assigned")&&feed.some(x=>x.type==="action_completed")],
    ["specialized route remains location guarded",/manager-actions\/service-exceptions[\s\S]*canAccessLocation\(locationId\)/.test(router)],
    ["Cloud API capability remains explicit",/"syncServiceExceptions"/.test(api)&&/syncServiceExceptions\(payload\)/.test(api)],
    ["client sends only current recovery truth",/filter\(x=>x\.recovery\)/.test(floor)&&/exceptions\}\)/.test(floor)],
    ["client avoids redundant snapshot writes",/digest===serviceManagerDigest/.test(floor)],
    ["Manager consumes existing ledger",/api\.managerActions\(LOCATION_ID\)/.test(manager)],
    ["Manager ownership uses existing PATCH",/updateManagerAction\(id,\{locationId:LOCATION_ID,assign:true/.test(ownership)],
    ["Manager follow-up uses existing action state",/BlueCurrentManagerTruthV100_2_68\?\.getState/.test(followup)],
    ["V100.2.99 server wiring remains",/new ActionListService\(database, operationsFeedService\)/.test(server)],
    ["operating signals cannot clear Service exceptions",/synchronizedTypes\.has\(action\.sourceRecordType\)/.test(source)],
    ["no second Service manager store",!floor.includes("blueCurrent.service.manager")],
    ["no automatic milestone advancement",!/status\s*:\s*["']dining["']/.test(floor.slice(floor.indexOf("V100.3.0 — Service → Manager")))],
    ["automatic actions remain non-editable",/Automatic actions cannot be edited/.test(source)],
    ["automatic actions remain non-deletable",/Automatic actions cannot be deleted/.test(source)],
    ["human completion decision preserved during refresh",/existing\.serviceContext = desiredAction\.serviceContext/.test(source)&&!/existing\.completed = false/.test(source)],
    ["certification exercised shared location id",orgB.locationId===alexAction.locationId],
    ["certification exercised independent organizations",orgB.organizationId!==alexAction.organizationId]
  ];
  let passed=0;for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(ok)passed++;}
  console.log(`V100.3.1 validation ${passed}/${checks.length}`);assert.equal(passed,checks.length);
  console.log(JSON.stringify({certified:{simultaneousExceptions:2,repeatDeduplication:true,ownershipIsolation:true,humanCompletionPreserved:true,automaticRecoveryClearing:true,tenantLocationIsolation:true,operationsFeedContinuity:true,noSecondQueue:true}},null,2));
})().catch(error=>{console.error(error);process.exit(1);});
