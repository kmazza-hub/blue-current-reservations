(function(){"use strict";
class BlueCurrentAIPExecutionPlanEngine{
 constructor(eventBus){this.eventBus=eventBus;this.key="bluecurrent:v4034:execution-plans";this.plans=this.read();}
 read(){try{const v=JSON.parse(localStorage.getItem(this.key)||"[]");return Array.isArray(v)?v:[];}catch{return[];}}
 save(){localStorage.setItem(this.key,JSON.stringify(this.plans));}
 create(command,owner){if(!command)throw new Error("Run an AIP command first.");const plan={id:`AIP-PLAN-${Date.now()}`,commandId:command.id,title:command.prompt,agent:command.agent,owner:String(owner||"Manager").trim()||"Manager",approvalRequired:command.approvalRequired,status:command.approvalRequired?"pending-approval":"ready-for-review",createdAt:new Date().toISOString(),steps:[{id:1,label:"Confirm current operating evidence",status:"open"},{id:2,label:"Review recommended action and tradeoffs",status:"open"},{id:3,label:command.approvalRequired?"Obtain manager approval":"Confirm accountable owner",status:"open"},{id:4,label:"Execute outside the sandbox and capture outcome",status:"open"}]};this.plans.unshift(plan);this.plans=this.plans.slice(0,60);this.save();this.eventBus?.emit?.("aip:execution-plan-created",plan);return plan;}
 setStatus(id,status){const plan=this.plans.find(p=>p.id===id);if(!plan)return null;plan.status=status;plan.updatedAt=new Date().toISOString();this.save();this.eventBus?.emit?.("aip:execution-plan-updated",plan);return plan;}
}
window.BlueCurrentAIPExecutionPlanEngine=BlueCurrentAIPExecutionPlanEngine;})();
