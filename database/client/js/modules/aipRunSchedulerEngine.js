(function(){"use strict";
class BlueCurrentAIPRunSchedulerEngine{
 constructor(eventBus){this.eventBus=eventBus;this.key="bluecurrent:v4038:run-schedules";this.schedules=this.read();}
 read(){try{const value=JSON.parse(localStorage.getItem(this.key)||"[]");return Array.isArray(value)?value:[];}catch{return[];}}
 save(){localStorage.setItem(this.key,JSON.stringify(this.schedules));}
 create(input){const planId=String(input.planId||"").trim();if(!planId)throw new Error("Enter an approved execution plan ID.");const item={id:`AIP-RUN-${Date.now()}`,planId,owner:String(input.owner||"Manager").trim(),cadence:input.cadence||"manual",mode:input.mode||"simulation",status:"scheduled",approvalRequired:true,createdAt:new Date().toISOString(),lastRunAt:null};this.schedules.unshift(item);this.schedules=this.schedules.slice(0,100);this.save();this.eventBus?.emit?.("aip:run-scheduled",item);return item;}
 requestRun(id){const item=this.schedules.find(s=>s.id===id);if(!item)return null;item.status=item.mode==="simulation"?"simulated":"approval-pending";item.lastRunAt=new Date().toISOString();this.save();this.eventBus?.emit?.("aip:scheduled-run-requested",{...item});return item;}
 cancel(id){const item=this.schedules.find(s=>s.id===id);if(!item)return null;item.status="cancelled";item.updatedAt=new Date().toISOString();this.save();return item;}
}
window.BlueCurrentAIPRunSchedulerEngine=BlueCurrentAIPRunSchedulerEngine;})();