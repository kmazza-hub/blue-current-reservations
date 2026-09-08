(function(){"use strict";
class BlueCurrentCorrectiveActionPlanEngine{
 constructor(){this.key="bluecurrent:v3921:corrective-actions";this.rootKey="bluecurrent:v3921:root-causes";}
 read(key=this.key,fallback=[]){try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));}catch{return fallback;}}
 write(v){localStorage.setItem(this.key,JSON.stringify(v));return v;}
 roots(){return this.read(this.rootKey,[]);}
 list(){return this.read().slice().sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));}
 add({rootCauseId,action,owner,dueAt,verification}){if(!rootCauseId||!action.trim())throw new Error("Select a root cause and enter a corrective action.");const rows=this.list();const item={id:`CAP-${Date.now()}`,rootCauseId,action:action.trim(),owner:(owner||"Manager").trim(),dueAt:dueAt||null,verification:(verification||"").trim(),status:"open",createdAt:new Date().toISOString(),completedAt:null};rows.unshift(item);this.write(rows.slice(0,150));return item;}
 setStatus(id,status){const rows=this.list(),item=rows.find(x=>x.id===id);if(item){item.status=status;item.completedAt=status==="completed"?new Date().toISOString():null;this.write(rows);}return item;}
 snapshot(){const rows=this.list(),now=Date.now(),open=rows.filter(x=>x.status!=="completed"),overdue=open.filter(x=>x.dueAt&&new Date(x.dueAt).getTime()<now);return{rows,roots:this.roots(),open:open.length,completed:rows.length-open.length,overdue:overdue.length,status:overdue.length?"overdue":open.length?"active":"clear"};}
}
window.BlueCurrentCorrectiveActionPlanEngine=BlueCurrentCorrectiveActionPlanEngine;})();