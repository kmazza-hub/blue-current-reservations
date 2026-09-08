(function(){"use strict";
class BlueCurrentPriorityFocusEngine{
 constructor({eventBus,appState}){this.eventBus=eventBus;this.appState=appState;this.off=[];["shift-intelligence:updated","executive-decision-feed:updated","action-ownership:updated"].forEach(n=>this.off.push(eventBus.on(n,()=>this.eventBus.emit("priority-focus:updated",this.snapshot()))));}
 ownership(){try{return JSON.parse(localStorage.getItem("bluecurrent:operations-action-ownership")||"{}");}catch{return {};}}
 snapshot(){const s=this.appState.getState(),feed=s.executiveDecisionFeed?.items||[],shift=s.shiftIntelligence?.recommendations||[];const map=new Map();[...feed,...shift].forEach((item,i)=>{const id=String(item.id||`priority-${i}`);if(!map.has(id))map.set(id,{id,title:item.title||"Operational priority",detail:item.detail||"Review this operating decision.",urgency:item.urgency||"watch",impact:Number(item.impact)||0,confidence:Number(item.confidence)||0,owner:item.owner||"Manager"});});const saved=this.ownership();const items=[...map.values()].map(x=>({...x,...(saved[x.id]||{}),status:saved[x.id]?.status||"open"})).sort((a,b)=>({critical:4,high:3,watch:2,opportunity:1}[b.urgency]||0)-({critical:4,high:3,watch:2,opportunity:1}[a.urgency]||0)||b.impact-a.impact).slice(0,3);return{capturedAt:new Date().toISOString(),items,open:items.filter(x=>x.status==="open").length,owned:items.filter(x=>x.assignedOwner).length,inProgress:items.filter(x=>x.status==="in-progress").length,done:items.filter(x=>x.status==="done").length};}
 refresh(){const v=this.snapshot();this.eventBus.emit("priority-focus:updated",v);return v;}
 destroy(){this.off.forEach(fn=>fn?.());}
}
window.BlueCurrentPriorityFocusEngine=BlueCurrentPriorityFocusEngine;})();
