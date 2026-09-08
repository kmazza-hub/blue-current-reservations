(function(){"use strict";
class BlueCurrentAIPImprovementBacklogEngine{
 constructor(eventBus){this.eventBus=eventBus;this.key="bluecurrent:v4030:improvement-backlog";this.items=this.read();}
 read(){try{return JSON.parse(localStorage.getItem(this.key)||"[]");}catch{return[];}}
 save(){localStorage.setItem(this.key,JSON.stringify(this.items));}
 sourceActions(){
  const loop=JSON.parse(localStorage.getItem("bluecurrent:v4029:learning-loop")||"null");
  const feedback=JSON.parse(localStorage.getItem("bluecurrent:v4028:human-feedback")||"[]");
  const observations=JSON.parse(localStorage.getItem("bluecurrent:v4027:pilot-observations")||"[]");
  const evaluations=JSON.parse(localStorage.getItem("bluecurrent:v4010:evaluations")||"[]");
  const actions=[];
  (loop?.actions||[]).forEach((title,index)=>actions.push({source:`learning-loop:${index+1}`,title,evidence:"Continuous learning loop"}));
  feedback.filter(x=>x.decision==="rework"||Number(x.rating||0)<4).forEach(x=>actions.push({source:`feedback:${x.id||x.createdAt||Date.now()}`,title:`Improve ${x.agent||"agent"} response quality`,evidence:x.note||`Reviewer rating ${x.rating||"—"}/5`}));
  observations.filter(x=>String(x.status).toLowerCase()==="watch").forEach(x=>actions.push({source:`observation:${x.id||x.createdAt||Date.now()}`,title:"Resolve pilot observation before wider rollout",evidence:x.note||"Pilot observation in watch status"}));
  evaluations.filter(x=>String(x.status||x.result).toLowerCase().includes("fail")).forEach(x=>actions.push({source:`evaluation:${x.id||x.createdAt||Date.now()}`,title:"Remediate failed agent evaluation",evidence:x.expected||x.notes||"Formal evaluation did not pass"}));
  return actions;
 }
 generate(owner="AIP Quality Owner",priority="medium"){
  const existing=new Set(this.items.map(x=>x.source));
  this.sourceActions().forEach(action=>{if(existing.has(action.source))return;this.items.unshift({id:`AIP-IMP-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,owner,priority,status:"open",createdAt:new Date().toISOString(),...action});});
  this.items=this.items.slice(0,150);this.save();this.eventBus?.emit?.("aip:improvement-backlog-updated",this.summary());return this.items;
 }
 setStatus(id,status){const item=this.items.find(x=>x.id===id);if(!item)return null;item.status=status;item.updatedAt=new Date().toISOString();this.save();this.eventBus?.emit?.("aip:improvement-backlog-updated",this.summary());return item;}
 summary(){return{total:this.items.length,open:this.items.filter(x=>x.status==="open").length,inProgress:this.items.filter(x=>x.status==="in-progress").length,completed:this.items.filter(x=>x.status==="complete").length,items:this.items};}
}
window.BlueCurrentAIPImprovementBacklogEngine=BlueCurrentAIPImprovementBacklogEngine;})();
