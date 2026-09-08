(function(){"use strict";
class BlueCurrentAIPApprovalQueueEngine{
 constructor(eventBus){this.eventBus=eventBus;this.key="bluecurrent:v405:aip-approvals";this.bind();}
 list(){try{return JSON.parse(localStorage.getItem(this.key)||"[]");}catch{return[];}}
 save(rows){localStorage.setItem(this.key,JSON.stringify(rows.slice(0,100)));this.eventBus?.emit?.("aip:approval-queue-updated",{count:rows.length});}
 enqueue(input={}){const item={id:input.id||`APR-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,type:input.type||"agent_action",title:input.title||input.tool||"Governed AI action",owner:input.owner||"Manager",risk:input.risk||"write",status:"pending",evidence:input.evidence||input.request||{},createdAt:new Date().toISOString()};const rows=this.list();if(!rows.some(x=>x.id===item.id)){rows.unshift(item);this.save(rows);}return item;}
 decide(id,status,reviewer,note=""){const rows=this.list();const item=rows.find(x=>x.id===id);if(!item)return null;item.status=status;item.reviewedBy=reviewer||"Manager";item.note=note;item.reviewedAt=new Date().toISOString();this.save(rows);this.eventBus?.emit?.(`aip:approval-${status}`,item);return item;}
 bind(){this.eventBus?.on?.("aip:workflow-drafted",w=>this.enqueue({id:`WFAPR-${w.id}`,type:"workflow",title:w.prompt,owner:w.owner,risk:"write",evidence:{steps:w.steps,workflowId:w.id}}));this.eventBus?.on?.("aip:approval-requested",x=>this.enqueue(x));}
 summary(){const rows=this.list();return{pending:rows.filter(x=>x.status==="pending").length,approved:rows.filter(x=>x.status==="approved").length,rejected:rows.filter(x=>x.status==="rejected").length,rows};}
}
window.BlueCurrentAIPApprovalQueueEngine=BlueCurrentAIPApprovalQueueEngine;})();