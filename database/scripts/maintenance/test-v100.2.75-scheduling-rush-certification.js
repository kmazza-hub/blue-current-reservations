"use strict";
const fs=require("fs"),path=require("path");
const root=process.cwd(),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const SchedulingService=require(path.join(root,"server/services/schedulingService.js"));
const serviceSource=read("server/services/schedulingService.js");
const truthSource=read("client/js/scheduling-truth-v100.2.73.js");
const coverageSource=read("client/js/staff-role-coverage-v100.2.65.js");
const attendanceSource=read("client/js/staff-attendance-v100.2.66.js");
const floorSource=read("client/js/floor-reservations-v62.0.js");

function clone(v){return JSON.parse(JSON.stringify(v));}
class MemoryDb{
  constructor(seed){this.db=clone(seed);}
  async read(){return clone(this.db);}
  async get(collection,id){return clone((this.db[collection]||[]).find(x=>x.id===id)||null);}
  async create(collection,row){this.db[collection]||=[];this.db[collection].push(clone(row));return clone(row);}
  async update(collection,id,patch){const row=(this.db[collection]||[]).find(x=>x.id===id);if(!row)return null;Object.assign(row,clone(patch));return clone(row);}
  async mutate(fn){return fn(this.db);}
}
const audit={record:async()=>({ok:true})};
const events=[];const realtime={publish:(name,payload)=>events.push({name,payload:clone(payload)})};
const base={
 staff:[
  {id:"emp_1",organizationId:"org_1",locationId:"loc_a",employmentStatus:"active",name:"Alex",role:"Server",hourlyRate:20},
  {id:"emp_2",organizationId:"org_1",locationId:"loc_a",employmentStatus:"active",name:"Blair",role:"Host",hourlyRate:18},
  {id:"emp_3",organizationId:"org_1",locationId:"loc_b",employmentStatus:"active",name:"Casey",role:"Server",hourlyRate:21}
 ],
 scheduleShifts:[
  {id:"a1",organizationId:"org_1",locationId:"loc_a",date:"2026-08-31",startTime:"17:00",endTime:"22:00",employeeId:"emp_1",role:"Server",department:"Service",status:"draft",createdAt:"2026-08-30T10:00:00.000Z",updatedAt:"2026-08-30T10:00:00.000Z"},
  {id:"a2",organizationId:"org_1",locationId:"loc_a",date:"2026-08-31",startTime:"16:00",endTime:"21:00",employeeId:"emp_2",role:"Host",department:"Service",status:"draft",createdAt:"2026-08-30T10:00:00.000Z",updatedAt:"2026-08-30T10:00:00.000Z"},
  {id:"b1",organizationId:"org_1",locationId:"loc_b",date:"2026-08-31",startTime:"17:00",endTime:"22:00",employeeId:"emp_3",role:"Server",department:"Service",status:"draft",createdAt:"2026-08-30T10:00:00.000Z",updatedAt:"2026-08-30T10:00:00.000Z"},
  {id:"next1",organizationId:"org_1",locationId:"loc_a",date:"2026-09-07",startTime:"17:00",endTime:"22:00",employeeId:"emp_1",role:"Server",department:"Service",status:"draft",createdAt:"2026-08-30T10:00:00.000Z",updatedAt:"2026-08-30T10:00:00.000Z"}
 ],
 schedulePublications:[],employeeAvailability:[],ptoRequests:[],reservations:[]
};

(async()=>{
 const checks=[];const check=(name,ok)=>checks.push([name,!!ok]);
 check("certification is runtime-neutral",!fs.existsSync(path.join(root,"client/js/scheduling-rush-v100.2.75.js")));
 check("Scheduling truth foundation remains primary",/Who is scheduled to work\?/.test(truthSource));
 check("publication integrity remains active",/publicationCurrent/.test(serviceSource));
 check("Staffing coverage still requires published Scheduling",/schedule\.publication\.status!=="published"/.test(coverageSource));
 check("attendance still requires published Scheduling",/schedule\.publication\.status!=="published"/.test(attendanceSource));
 check("protected Floor remains present",/V100\.2\.47 — Floor Layout Restoration/.test(floorSource));
 check("no timer introduced by certification",!serviceSource.includes("setInterval(")&&!serviceSource.includes("MutationObserver"));

 const db=new MemoryDb(base),svc=new SchedulingService(db,audit,realtime);
 let a=await svc.snapshot("org_1","loc_a","2026-08-31");
 let b=await svc.snapshot("org_1","loc_b","2026-08-31");
 let next=await svc.snapshot("org_1","loc_a","2026-09-07");
 check("week snapshot isolates current week",a.shifts.length===2&&next.shifts.length===1);
 check("location snapshot isolates locations",a.shifts.every(x=>x.locationId==="loc_a")&&b.shifts.every(x=>x.locationId==="loc_b"));
 check("unpublished locations begin uncertified",a.publication===null&&b.publication===null);

 await svc.publish({locationId:"loc_a",weekStart:"2026-08-31"},"Manager A","org_1");
 a=await svc.snapshot("org_1","loc_a","2026-08-31"); b=await svc.snapshot("org_1","loc_b","2026-08-31"); next=await svc.snapshot("org_1","loc_a","2026-09-07");
 check("publishing one location certifies only that location",a.publication?.status==="published"&&b.publication===null);
 check("publishing one week does not certify next week",next.publication===null&&next.shifts[0].status==="draft");
 check("publish marks every shift in target week/location",a.shifts.length===2&&a.shifts.every(x=>x.status==="published"));

 await svc.update("a1",{startTime:"17:30"},"Manager A","org_1");
 a=await svc.snapshot("org_1","loc_a","2026-08-31"); b=await svc.snapshot("org_1","loc_b","2026-08-31");
 check("single shift edit invalidates target publication",a.publication===null&&a.shifts.find(x=>x.id==="a1")?.status==="draft");
 check("edit does not contaminate another location",b.shifts.find(x=>x.id==="b1")?.status==="draft"&&b.publication===null);

 await svc.publish({locationId:"loc_b",weekStart:"2026-08-31"},"Manager B","org_1");
 await svc.publish({locationId:"loc_a",weekStart:"2026-08-31"},"Manager A","org_1");
 await svc.create({locationId:"loc_a",date:"2026-09-01",startTime:"18:00",endTime:"23:00",role:"Busser",department:"Service"},"Manager A","org_1");
 a=await svc.snapshot("org_1","loc_a","2026-08-31"); b=await svc.snapshot("org_1","loc_b","2026-08-31");
 check("new shift invalidates only target publication",a.publication===null&&b.publication?.status==="published");
 check("new shift is explicitly draft",a.shifts.some(x=>x.role==="Busser"&&x.status==="draft"));

 await svc.publish({locationId:"loc_a",weekStart:"2026-08-31"},"Manager A","org_1");
 a=await svc.snapshot("org_1","loc_a","2026-08-31");
 const busser=a.shifts.find(x=>x.role==="Busser");
 await svc.remove(busser.id,"Manager A","org_1");
 a=await svc.snapshot("org_1","loc_a","2026-08-31"); b=await svc.snapshot("org_1","loc_b","2026-08-31");
 check("delete invalidates target week publication",a.publication===null);
 check("delete preserves other location publication",b.publication?.status==="published");
 check("delete emits explicit invalidation event",events.some(x=>x.name==="scheduling:publication-invalidated"&&x.payload.locationId==="loc_a"));

 await svc.publish({locationId:"loc_a",weekStart:"2026-08-31"},"Manager A","org_1");
 await db.mutate(state=>{const s=state.scheduleShifts.find(x=>x.id==="a2");s.status="published";s.updatedAt="2099-01-01T00:00:00.000Z";return s;});
 a=await svc.snapshot("org_1","loc_a","2026-08-31");
 check("post-publication external mutation cannot remain certified",a.publication===null);

 await db.mutate(state=>{const s=state.scheduleShifts.find(x=>x.id==="a1");s.employeeId="emp_2";s.startTime="16:30";s.endTime="20:00";s.status="draft";s.updatedAt=new Date().toISOString();return s;});
 a=await svc.snapshot("org_1","loc_a","2026-08-31");
 check("simultaneous employee overlap is detected",a.validations.some(x=>x.code==="OVERLAP"));

 await db.mutate(state=>{state.scheduleShifts.push({id:"open1",organizationId:"org_1",locationId:"loc_a",date:"2026-09-02",startTime:"17:00",endTime:"21:00",employeeId:null,role:"Server",department:"Service",status:"draft",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});return true;});
 a=await svc.snapshot("org_1","loc_a","2026-08-31");
 check("open shift remains visible as a warning",a.validations.some(x=>x.code==="OPEN_SHIFT")&&a.summary.openShifts===1);

 const foreign=await svc.snapshot("org_2","loc_a","2026-08-31");
 check("organization boundary is isolated",foreign.shifts.length===0&&foreign.employees.length===0&&foreign.publication===null);
 check("Scheduling UI excludes AI recommendations from primary truth",/AI staffing recommendations excluded/.test(truthSource));
 check("certification adds no runtime script reference",!read("client/index.html").includes("scheduling-rush-v100.2.75.js"));

 let passed=0;for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(ok)passed++;}
 console.log(`V100.2.75 validation ${passed}/${checks.length}`);if(passed!==checks.length)process.exit(1);
})().catch(error=>{console.error(error);process.exit(1);});
