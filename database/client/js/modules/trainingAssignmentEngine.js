(function(){"use strict";
class BlueCurrentTrainingAssignmentEngine{
 constructor(){this.key="bluecurrent:v3924:training-assignments";this.linkKey="bluecurrent:v3924:standard-work-links";}
 read(key,fallback=[]){try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));}catch{return fallback;}}
 write(v){localStorage.setItem(this.key,JSON.stringify(v));return v;}
 links(){return this.read(this.linkKey,[]);}
 list(){return this.read(this.key,[]).slice().sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));}
 add({standardWorkId,teamMember,dueAt,coach}){if(!standardWorkId||!teamMember.trim())throw new Error("Choose standard work and enter a team member.");const rows=this.list();const item={id:`TRN-${Date.now()}`,standardWorkId,teamMember:teamMember.trim(),coach:(coach||"Manager").trim(),dueAt:dueAt||null,status:"assigned",createdAt:new Date().toISOString(),completedAt:null};rows.unshift(item);this.write(rows.slice(0,200));return item;}
 complete(id){const rows=this.list(),item=rows.find(x=>x.id===id);if(item){item.status="completed";item.completedAt=new Date().toISOString();this.write(rows);}return item;}
 snapshot(){const rows=this.list(),now=Date.now(),open=rows.filter(x=>x.status!=="completed"),overdue=open.filter(x=>x.dueAt&&new Date(x.dueAt).getTime()<now);return{rows,links:this.links(),open:open.length,completed:rows.length-open.length,overdue:overdue.length,completion:rows.length?Math.round((rows.length-open.length)/rows.length*100):0,status:overdue.length?"overdue":open.length?"active":"clear"};}
}
window.BlueCurrentTrainingAssignmentEngine=BlueCurrentTrainingAssignmentEngine;})();