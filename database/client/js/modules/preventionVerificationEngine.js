(function(){"use strict";
class BlueCurrentPreventionVerificationEngine{
 constructor(){this.key="bluecurrent:v3924:prevention-verifications";this.actionKey="bluecurrent:v3921:corrective-actions";this.trainingKey="bluecurrent:v3924:training-assignments";}
 read(key,fallback=[]){try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));}catch{return fallback;}}
 write(v){localStorage.setItem(this.key,JSON.stringify(v));return v;}
 actions(){return this.read(this.actionKey,[]).filter(x=>x.status==="completed");}
 training(){return this.read(this.trainingKey,[]);}
 list(){return this.read(this.key,[]).slice().sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));}
 add({correctiveActionId,result,owner,note}){if(!correctiveActionId||!note.trim())throw new Error("Choose a completed corrective action and record evidence.");const rows=this.list();const item={id:`PV-${Date.now()}`,correctiveActionId,result:result||"effective",owner:(owner||"Manager").trim(),note:note.trim(),createdAt:new Date().toISOString()};rows.unshift(item);this.write(rows.slice(0,200));return item;}
 snapshot(){const rows=this.list(),actions=this.actions(),training=this.training(),effective=rows.filter(x=>x.result==="effective").length,failed=rows.filter(x=>x.result==="failed").length,verified=new Set(rows.map(x=>x.correctiveActionId));return{rows,actions,training,effective,failed,pending:actions.filter(x=>!verified.has(x.id)).length,score:rows.length?Math.round(effective/rows.length*100):0,status:failed?"follow-up required":rows.length?"verified":"awaiting evidence"};}
}
window.BlueCurrentPreventionVerificationEngine=BlueCurrentPreventionVerificationEngine;})();