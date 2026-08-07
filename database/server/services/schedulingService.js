"use strict";

const DAY_MS = 86400000;
const pad = value => String(value).padStart(2, "0");
const minutes = value => { const [h,m] = String(value || "00:00").split(":").map(Number); return h * 60 + m; };
const durationHours = shift => Math.max(0, (minutes(shift.endTime) - minutes(shift.startTime)) / 60);
const mondayOf = value => { const date = new Date(`${value || new Date().toISOString().slice(0,10)}T12:00:00`); const day = date.getDay(); date.setDate(date.getDate() - ((day + 6) % 7)); return date.toISOString().slice(0,10); };

class SchedulingService {
  constructor(database, auditService, realtimeHub) { this.database=database; this.auditService=auditService; this.realtimeHub=realtimeHub; }

  async snapshot(organizationId, locationId, requestedWeek) {
    const weekStart=mondayOf(requestedWeek); const weekEnd=new Date(new Date(`${weekStart}T12:00:00`).getTime()+6*DAY_MS).toISOString().slice(0,10);
    const db=await this.database.read();
    const employees=(db.staff||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId&&(x.employmentStatus||"active")==="active");
    const employeeIds=new Set(employees.map(x=>x.id));
    const shifts=(db.scheduleShifts||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId&&x.date>=weekStart&&x.date<=weekEnd).sort((a,b)=>`${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
    const publications=(db.schedulePublications||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId&&x.weekStart===weekStart);
    const validations=this.validate(shifts,employees,db.employeeAvailability||[],db.ptoRequests||[]);
    const intelligence=this.intelligence({weekStart,weekEnd,shifts,employees,availability:db.employeeAvailability||[],ptoRequests:db.ptoRequests||[],reservations:(db.reservations||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId)});
    const totalHours=shifts.reduce((s,x)=>s+durationHours(x),0); const projectedLabor=shifts.reduce((s,x)=>{const e=employees.find(p=>p.id===x.employeeId);return s+durationHours(x)*Number(e?.hourlyRate||0)},0);
    return {weekStart,weekEnd,employees,shifts,validations,intelligence,publication:publications.at(-1)||null,summary:{totalShifts:shifts.length,openShifts:shifts.filter(x=>!x.employeeId).length,totalHours:Number(totalHours.toFixed(1)),projectedLabor:Math.round(projectedLabor),conflicts:validations.filter(x=>x.severity==="error").length,warnings:validations.filter(x=>x.severity==="warning").length},generatedAt:new Date().toISOString()};
  }

  validate(shifts,employees,availability,ptoRequests){
    const issues=[]; const hours=new Map();
    for(const shift of shifts){
      const employee=employees.find(x=>x.id===shift.employeeId);
      if(!shift.employeeId){ issues.push({id:`open_${shift.id}`,shiftId:shift.id,severity:"warning",code:"OPEN_SHIFT",message:`${shift.role} shift is unassigned.`}); continue; }
      if(!employee){ issues.push({id:`missing_${shift.id}`,shiftId:shift.id,severity:"error",code:"EMPLOYEE_MISSING",message:"Assigned employee is unavailable."}); continue; }
      const day=new Date(`${shift.date}T12:00:00`).getDay(); const window=availability.find(x=>x.employeeId===shift.employeeId&&Number(x.dayOfWeek)===day&&x.available!==false);
      if(window&&(minutes(shift.startTime)<minutes(window.startTime)||minutes(shift.endTime)>minutes(window.endTime))) issues.push({id:`availability_${shift.id}`,shiftId:shift.id,severity:"warning",code:"OUTSIDE_AVAILABILITY",message:`${employee.name} is scheduled outside saved availability.`});
      const pto=ptoRequests.find(x=>x.employeeId===shift.employeeId&&x.status==="approved"&&shift.date>=x.startDate&&shift.date<=x.endDate);
      if(pto) issues.push({id:`pto_${shift.id}`,shiftId:shift.id,severity:"error",code:"PTO_CONFLICT",message:`${employee.name} has approved PTO.`});
      const same=shifts.filter(x=>x.id!==shift.id&&x.employeeId===shift.employeeId&&x.date===shift.date&&minutes(x.startTime)<minutes(shift.endTime)&&minutes(x.endTime)>minutes(shift.startTime));
      if(same.length) issues.push({id:`overlap_${shift.id}`,shiftId:shift.id,severity:"error",code:"OVERLAP",message:`${employee.name} has overlapping shifts.`});
      hours.set(employee.id,(hours.get(employee.id)||0)+durationHours(shift));
    }
    for(const [id,total] of hours){if(total>40){const employee=employees.find(x=>x.id===id);issues.push({id:`ot_${id}`,employeeId:id,severity:"warning",code:"OVERTIME",message:`${employee?.name||"Employee"} is scheduled for ${total.toFixed(1)} hours.`});}}
    return [...new Map(issues.map(x=>[x.id,x])).values()];
  }

  async create(input,actor,organizationId){
    if(!input.locationId||!input.date||!input.startTime||!input.endTime||!input.role) throw new Error("locationId, date, startTime, endTime, and role are required");
    if(minutes(input.endTime)<=minutes(input.startTime)) throw new Error("endTime must be after startTime");
    const shift={id:`shift_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId,locationId:input.locationId,date:input.date,startTime:input.startTime,endTime:input.endTime,employeeId:input.employeeId||null,role:String(input.role),department:String(input.department||"Service"),notes:String(input.notes||""),status:"draft",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
    await this.database.create("scheduleShifts",shift); await this.record(organizationId,actor,`Created ${shift.role} shift on ${shift.date}`); this.realtimeHub.publish("scheduling:shift-created",shift); return shift;
  }
  async update(id,input,actor,organizationId){
    const existing=await this.database.get("scheduleShifts",id); if(!existing||existing.organizationId!==organizationId)return null;
    const allowed=["date","startTime","endTime","employeeId","role","department","notes"]; const patch=Object.fromEntries(Object.entries(input||{}).filter(([k])=>allowed.includes(k))); if(patch.employeeId==="")patch.employeeId=null;
    const start=patch.startTime||existing.startTime,end=patch.endTime||existing.endTime;if(minutes(end)<=minutes(start))throw new Error("endTime must be after startTime"); patch.updatedAt=new Date().toISOString(); patch.status="draft";
    const result=await this.database.update("scheduleShifts",id,patch); await this.record(organizationId,actor,`Updated ${result.role} shift on ${result.date}`); this.realtimeHub.publish("scheduling:shift-updated",result); return result;
  }
  async remove(id,actor,organizationId){const existing=await this.database.get("scheduleShifts",id);if(!existing||existing.organizationId!==organizationId)return false;await this.database.mutate(db=>{db.scheduleShifts=(db.scheduleShifts||[]).filter(x=>x.id!==id);return true});await this.record(organizationId,actor,`Deleted ${existing.role} shift on ${existing.date}`);this.realtimeHub.publish("scheduling:shift-deleted",{id});return true;}
  async publish(input,actor,organizationId){const weekStart=mondayOf(input.weekStart);const record={id:`publication_${Date.now()}`,organizationId,locationId:input.locationId,weekStart,status:"published",publishedBy:actor,publishedAt:new Date().toISOString()};await this.database.mutate(db=>{db.schedulePublications||=[];db.schedulePublications.push(record);for(const x of db.scheduleShifts||[])if(x.organizationId===organizationId&&x.locationId===input.locationId&&mondayOf(x.date)===weekStart)x.status="published";return record});await this.record(organizationId,actor,`Published schedule for ${weekStart}`);this.realtimeHub.publish("scheduling:published",record);return record;}
  async copyPrevious(input,actor,organizationId){const target=mondayOf(input.weekStart);const previous=new Date(new Date(`${target}T12:00:00`).getTime()-7*DAY_MS).toISOString().slice(0,10);let created=[];await this.database.mutate(db=>{db.scheduleShifts||=[];const source=db.scheduleShifts.filter(x=>x.organizationId===organizationId&&x.locationId===input.locationId&&mondayOf(x.date)===previous);created=source.map(x=>({...x,id:`shift_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,date:new Date(new Date(`${x.date}T12:00:00`).getTime()+7*DAY_MS).toISOString().slice(0,10),status:"draft",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}));db.scheduleShifts.push(...created);return created});await this.record(organizationId,actor,`Copied ${created.length} shifts into week ${target}`);this.realtimeHub.publish("scheduling:week-copied",{weekStart:target,count:created.length});return {weekStart:target,count:created.length};}

  intelligence({weekStart,weekEnd,shifts,employees,availability,ptoRequests,reservations}) {
    const recommendations=[]; const weeklyHours=new Map();
    for(const shift of shifts) if(shift.employeeId) weeklyHours.set(shift.employeeId,(weeklyHours.get(shift.employeeId)||0)+durationHours(shift));
    const eligible=(shift,excludeId=null)=>employees.map(employee=>{
      if(employee.id===excludeId)return null;
      const roleMatch=String(employee.role||'').toLowerCase()===String(shift.role||'').toLowerCase();
      const day=new Date(`${shift.date}T12:00:00`).getDay();
      const window=availability.find(x=>x.employeeId===employee.id&&Number(x.dayOfWeek)===day&&x.available!==false);
      const available=!window||(minutes(shift.startTime)>=minutes(window.startTime)&&minutes(shift.endTime)<=minutes(window.endTime));
      const pto=ptoRequests.some(x=>x.employeeId===employee.id&&x.status==='approved'&&shift.date>=x.startDate&&shift.date<=x.endDate);
      const overlap=shifts.some(x=>x.id!==shift.id&&x.employeeId===employee.id&&x.date===shift.date&&minutes(x.startTime)<minutes(shift.endTime)&&minutes(x.endTime)>minutes(shift.startTime));
      const projected=(weeklyHours.get(employee.id)||0)+durationHours(shift);
      if(!available||pto||overlap)return null;
      const score=(roleMatch?50:10)+(projected<=40?25:0)+Math.max(0,20-projected/2);
      return {employeeId:employee.id,name:employee.name,role:employee.role,projectedHours:Number(projected.toFixed(1)),score:Math.round(score),reasons:[roleMatch?'Role match':'Cross-trained option',available?'Available':'',projected<=40?'No overtime':'Overtime risk'].filter(Boolean)};
    }).filter(Boolean).sort((a,b)=>b.score-a.score);
    for(const shift of shifts.filter(x=>!x.employeeId)){const candidates=eligible(shift).slice(0,3);recommendations.push({id:`fill_${shift.id}`,type:'SMART_FILL',priority:candidates.length?'high':'critical',shiftId:shift.id,title:`Fill ${shift.role} shift`,message:candidates.length?`${candidates[0].name} is the best available match for ${shift.date}, ${shift.startTime}–${shift.endTime}.`:'No conflict-free employee is currently available.',candidates,actionable:!!candidates.length});}
    for(const [employeeId,total] of weeklyHours) if(total>40){const employee=employees.find(x=>x.id===employeeId);const employeeShifts=shifts.filter(x=>x.employeeId===employeeId).sort((a,b)=>durationHours(b)-durationHours(a));const shift=employeeShifts[0];const candidates=shift?eligible(shift,employeeId).slice(0,3):[];recommendations.push({id:`ot_${employeeId}`,type:'OVERTIME_REDUCTION',priority:'high',shiftId:shift?.id||null,title:`Reduce ${employee?.name||'employee'} overtime`,message:`Projected at ${total.toFixed(1)} hours. ${candidates[0]?`Reassign one shift to ${candidates[0].name}.`:'No clean replacement was found.'}`,candidates,actionable:!!candidates.length});}
    const demandByDate={}; for(const r of reservations){const date=String(r.reservationTime||'').slice(0,10);if(date>=weekStart&&date<=weekEnd&&!['cancelled','no_show'].includes(r.status))demandByDate[date]=(demandByDate[date]||0)+Number(r.partySize||0);}
    for(const [date,covers] of Object.entries(demandByDate)){const needed=Math.max(1,Math.ceil(covers/24));const servers=shifts.filter(x=>x.date===date&&String(x.role).toLowerCase().includes('server')&&x.startTime<'21:00'&&x.endTime>'17:00').length;if(servers<needed)recommendations.push({id:`demand_${date}`,type:'DEMAND_COVERAGE',priority:'high',title:`Add dinner coverage on ${date}`,message:`${covers} reserved covers suggest ${needed} servers; only ${servers} are scheduled.`,candidates:[],actionable:false});}
    return {summary:{total:recommendations.length,critical:recommendations.filter(x=>x.priority==='critical').length,actionable:recommendations.filter(x=>x.actionable).length},recommendations:recommendations.sort((a,b)=>({critical:0,high:1,medium:2}[a.priority]||3)-({critical:0,high:1,medium:2}[b.priority]||3)),generatedAt:new Date().toISOString()};
  }

  async smartFill(input,actor,organizationId){
    const shift=await this.database.get('scheduleShifts',input.shiftId); if(!shift||shift.organizationId!==organizationId)return null;
    const snapshot=await this.snapshot(organizationId,shift.locationId,shift.date); const recommendation=snapshot.intelligence.recommendations.find(x=>x.shiftId===shift.id&&x.candidates?.length);
    const candidate=input.employeeId?recommendation?.candidates.find(x=>x.employeeId===input.employeeId):recommendation?.candidates[0]; if(!candidate)throw new Error('No eligible smart-fill candidate is available.');
    const result=await this.update(shift.id,{employeeId:candidate.employeeId},actor,organizationId); await this.record(organizationId,actor,`AI Smart Fill assigned ${candidate.name} to ${shift.role} shift`); this.realtimeHub.publish('scheduling:ai-applied',{shiftId:shift.id,employeeId:candidate.employeeId}); return {shift:result,candidate};
  }
  record(organizationId,actor,action){return this.auditService.record({organizationId,actor,action,category:"scheduling"});}
}
module.exports=SchedulingService;
