"use strict";
const fs=require("fs"),path=require("path");
const root=process.cwd(),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const SchedulingService=require(path.join(root,"server/services/schedulingService.js"));
const serviceSource=read("server/services/schedulingService.js");
const scheduleTruth=read("client/js/scheduling-truth-v100.2.73.js");
const coverage=read("client/js/staff-role-coverage-v100.2.65.js");
const floor=read("client/js/floor-reservations-v62.0.js");

function clone(v){return JSON.parse(JSON.stringify(v));}
class MemoryDb{
 constructor(seed){this.db=clone(seed);}
 async read(){return clone(this.db);}
 async get(collection,id){return clone((this.db[collection]||[]).find(x=>x.id===id)||null);}
 async create(collection,row){this.db[collection]||=[];this.db[collection].push(clone(row));return clone(row);}
 async update(collection,id,patch){const row=(this.db[collection]||[]).find(x=>x.id===id);if(!row)return null;Object.assign(row,clone(patch));return clone(row);}
 async mutate(fn){return fn(this.db);}
}
const audit={record:async()=>({ok:true})},events=[],realtime={publish:(name,payload)=>events.push({name,payload})};
const base={staff:[{id:"emp_1",organizationId:"org_1",locationId:"loc_marina",employmentStatus:"active",name:"Alex",role:"Server",hourlyRate:20}],scheduleShifts:[{id:"shift_1",organizationId:"org_1",locationId:"loc_marina",date:"2026-08-31",startTime:"17:00",endTime:"22:00",employeeId:"emp_1",role:"Server",department:"Service",status:"draft",createdAt:"2026-08-30T10:00:00.000Z",updatedAt:"2026-08-30T10:00:00.000Z"}],schedulePublications:[],employeeAvailability:[],ptoRequests:[],reservations:[]};

(async()=>{
 const checks=[];const check=(name,ok)=>checks.push([name,!!ok]);
 check("version purpose is publication integrity",/publicationCurrent/.test(serviceSource)&&/scheduling:publication-invalidated/.test(serviceSource));
 check("snapshot requires current shift publication state",/shift\.status==="published"/.test(serviceSource));
 check("snapshot guards mutations after publishedAt",/Date\.parse\(shift\.updatedAt\)<=publishedAt/.test(serviceSource));
 check("delete invalidates week publication record",/db\.schedulePublications=.*filter/.test(serviceSource)&&/shift-deleted/.test(serviceSource));
 check("existing Scheduling truth still keys UI from publication",/const published=!!state\.publication/.test(scheduleTruth));
 check("Staffing coverage still refuses an unpublished schedule",/schedule\.publication\.status!=="published"/.test(coverage));
 check("protected Floor remains present",/V100\.2\.47 — Floor Layout Restoration/.test(floor));

 const db=new MemoryDb(base),svc=new SchedulingService(db,audit,realtime);
 await svc.publish({locationId:"loc_marina",weekStart:"2026-08-31"},"Manager","org_1");
 let snap=await svc.snapshot("org_1","loc_marina","2026-08-31");
 check("freshly published schedule is certified",snap.publication?.status==="published");
 check("publish marks current shifts published",snap.shifts.every(x=>x.status==="published"));

 await svc.update("shift_1",{startTime:"17:30"},"Manager","org_1");
 snap=await svc.snapshot("org_1","loc_marina","2026-08-31");
 check("editing a published shift returns week to Draft",snap.publication===null);
 check("edited shift is explicitly draft",snap.shifts.find(x=>x.id==="shift_1")?.status==="draft");

 await svc.publish({locationId:"loc_marina",weekStart:"2026-08-31"},"Manager","org_1");
 snap=await svc.snapshot("org_1","loc_marina","2026-08-31");
 check("republish restores certified publication",snap.publication?.status==="published");

 await svc.create({locationId:"loc_marina",date:"2026-09-01",startTime:"18:00",endTime:"22:00",role:"Host",department:"Service"},"Manager","org_1");
 snap=await svc.snapshot("org_1","loc_marina","2026-08-31");
 check("adding a shift after publication returns week to Draft",snap.publication===null);

 await svc.publish({locationId:"loc_marina",weekStart:"2026-08-31"},"Manager","org_1");
 const beforeDelete=await svc.snapshot("org_1","loc_marina","2026-08-31");
 const deleteId=beforeDelete.shifts.find(x=>x.role==="Host").id;
 await svc.remove(deleteId,"Manager","org_1");
 snap=await svc.snapshot("org_1","loc_marina","2026-08-31");
 check("deleting a published shift invalidates publication",snap.publication===null);
 check("delete removes stale publication records",(await db.read()).schedulePublications.filter(x=>x.weekStart==="2026-08-31").length===0);
 check("delete emits explicit publication invalidation event",events.some(x=>x.name==="scheduling:publication-invalidated"&&x.payload.weekStart==="2026-08-31"));

 await svc.publish({locationId:"loc_marina",weekStart:"2026-08-31"},"Manager","org_1");
 await db.mutate(state=>{const shift=state.scheduleShifts.find(x=>x.id==="shift_1");shift.status="draft";shift.updatedAt="2026-08-30T20:00:00.000Z";return shift;});
 snap=await svc.snapshot("org_1","loc_marina","2026-08-31");
 check("external draft mutation cannot masquerade as published",snap.publication===null);

 let passed=0;for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(ok)passed++;}
 console.log(`V100.2.74 validation ${passed}/${checks.length}`);if(passed!==checks.length)process.exit(1);
})().catch(error=>{console.error(error);process.exit(1);});
