"use strict";
class PortfolioExceptionCommandService{
 constructor(database,portfolio){this.database=database;this.portfolio=portfolio;}
 now(){return new Date().toISOString();}
 age(v){const t=new Date(v||0).getTime();return Number.isFinite(t)&&t?Math.max(0,(Date.now()-t)/3600000):0;}
 async list(o,allowed=[]){
  const p=await this.portfolio.portfolio(o,allowed),db=await this.database.read();
  const saved=(db.portfolioExceptions||[]).filter(x=>x.organizationId===o&& !["RESOLVED","DISMISSED"].includes(x.status));
  const generated=[];
  for(const l of p.executiveAttention||[])for(const reason of l.attention||[]){
   if(saved.some(x=>x.locationId===l.locationId&&x.reason===reason))continue;
   generated.push({id:`pe-${l.locationId}-${reason}`.toLowerCase().replace(/[^a-z0-9-]/g,"-"),organizationId:o,locationId:l.locationId,locationName:l.name,reason,severity:l.health==="CRITICAL"?"CRITICAL":"WATCH",status:"UNOWNED",owner:null,openedAt:p.generatedAt,acknowledgedAt:null,decisionRequired:l.health==="CRITICAL",source:"PORTFOLIO_HEALTH"});
  }
  const items=[...saved,...generated].map(x=>{const ageHours=this.age(x.openedAt),escalation=x.severity==="CRITICAL"&&ageHours>=1?"EXECUTIVE":ageHours>=4?"LEADERSHIP":"OPERATIONS";return {...x,ageHours,escalation,overdue:escalation!=="OPERATIONS"};});
  const patterns={};for(const x of items){patterns[x.reason]=patterns[x.reason]||new Set();patterns[x.reason].add(x.locationId);}
  const spreadingPatterns=Object.entries(patterns).filter(([,s])=>s.size>1).map(([reason,s])=>({reason,locations:[...s],count:s.size}));
  const rank={EXECUTIVE:0,LEADERSHIP:1,OPERATIONS:2};items.sort((a,b)=>rank[a.escalation]-rank[b.escalation]||b.ageHours-a.ageHours);
  return {version:"83.25.0",generatedAt:this.now(),organizationId:o,summary:{open:items.length,unowned:items.filter(x=>!x.owner).length,overdue:items.filter(x=>x.overdue).length,executive:items.filter(x=>x.escalation==="EXECUTIVE").length,affectedLocations:new Set(items.map(x=>x.locationId)).size,spreadingPatterns:spreadingPatterns.length},spreadingPatterns,exceptions:items,policy:{ownershipRequiredForAcknowledgement:true,criticalExceptionsEscalateAfterHours:1,watchExceptionsEscalateAfterHours:4,crossLocationPatternDetection:true,humanResolutionRequired:true,executiveDecisionRemainsHuman:true,noAutomaticOperationalAction:true,noAutomaticCrossLocationAction:true,autonomousProductionChanges:false}};
 }
 async acknowledge(o,allowed,id,input={},actor){
  const owner=String(input.owner||actor||"").trim().slice(0,120);if(!owner){const e=new Error("Exception acknowledgement requires an owner.");e.statusCode=400;throw e;}
  const item=(await this.list(o,allowed)).exceptions.find(x=>x.id===id);if(!item){const e=new Error("Portfolio exception not found.");e.statusCode=404;throw e;}
  const record={...item,status:"ACKNOWLEDGED",owner,acknowledgedAt:this.now(),acknowledgedBy:actor||owner};delete record.ageHours;delete record.escalation;delete record.overdue;
  await this.database.mutate(db=>{db.portfolioExceptions=db.portfolioExceptions||[];const i=db.portfolioExceptions.findIndex(x=>x.id===id&&x.organizationId===o);if(i>=0)db.portfolioExceptions[i]=record;else db.portfolioExceptions.push(record);return true;});
  return {exception:record,command:await this.list(o,allowed)};
 }
 async resolve(o,allowed,id,input={},actor){
  const item=(await this.list(o,allowed)).exceptions.find(x=>x.id===id);if(!item){const e=new Error("Portfolio exception not found.");e.statusCode=404;throw e;}
  const rationale=String(input.rationale||"").trim().slice(0,2500);if(rationale.length<10){const e=new Error("Exception resolution requires a rationale.");e.statusCode=400;throw e;}if(!item.owner){const e=new Error("Exception must be acknowledged and owned before resolution.");e.statusCode=409;throw e;}
  const record={...item,status:"RESOLVED",resolvedAt:this.now(),resolvedBy:actor||item.owner,rationale};delete record.ageHours;delete record.escalation;delete record.overdue;
  await this.database.mutate(db=>{db.portfolioExceptions=db.portfolioExceptions||[];const i=db.portfolioExceptions.findIndex(x=>x.id===id&&x.organizationId===o);if(i>=0)db.portfolioExceptions[i]=record;else db.portfolioExceptions.push(record);db.portfolioExceptionHistory=db.portfolioExceptionHistory||[];db.portfolioExceptionHistory.push(record);return true;});
  return {resolved:record,command:await this.list(o,allowed)};
 }
}
module.exports=PortfolioExceptionCommandService;
