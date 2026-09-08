(function(){"use strict";
class BlueCurrentExecutiveDecisionFeedEngine{
 constructor({eventBus,appState}){this.eventBus=eventBus;this.appState=appState;this.off=[];["shift-intelligence:updated","outcome-intelligence:updated","portfolio-performance:updated","margin-intelligence:updated","smart-alerts:updated"].forEach(n=>this.off.push(eventBus.on(n,()=>this.refresh(n))));}
 snapshot(){const s=this.appState.getState(),shift=s.shiftIntelligence||{},items=[];for(const r of shift.recommendations||[])items.push({...r,source:"Shift Intelligence",category:r.urgency==="critical"?"risk":"opportunity",timeRemaining:r.urgency==="critical"?5:r.urgency==="high"?12:25});
 const alerts=s.smartAlertRouter?.alerts||[];for(const a of alerts.slice(0,4))items.push({id:`alert-${a.id||items.length}`,title:a.title||"Operational alert",detail:a.detail||a.message||"Review the operating exception.",impact:Number(a.profitImpact||a.impact||0),confidence:Number(a.confidence||78),urgency:a.severity||"watch",owner:a.owner||"Manager",source:"Smart Alerts",category:"risk",timeRemaining:Number(a.responseMinutes||10)});
 const ranked=items.map(x=>({...x,priorityScore:Math.round((x.impact||0)*.12+(x.confidence||0)*.55+({critical:40,high:28,watch:16,opportunity:10}[x.urgency]||8)-Math.min(20,x.timeRemaining||20))})).sort((a,b)=>b.priorityScore-a.priorityScore).slice(0,8);
 const value={capturedAt:new Date().toISOString(),status:ranked.some(x=>x.urgency==="critical")?"attention":ranked.length?"active":"clear",count:ranked.length,totalImpact:ranked.reduce((n,x)=>n+(Number(x.impact)||0),0),items:ranked,top:ranked[0]||null};this.appState.update({executiveDecisionFeed:value});this.eventBus.emit("executive-decision-feed:updated",structuredClone(value));return value;}
 refresh(){return this.snapshot();}
 open(id){const v=this.snapshot(),item=v.items.find(x=>x.id===id);if(item)this.eventBus.emit("executive-decision:selected",item);return item;}
 destroy(){this.off.forEach(x=>x?.());}
}
window.BlueCurrentExecutiveDecisionFeedEngine=BlueCurrentExecutiveDecisionFeedEngine;})();