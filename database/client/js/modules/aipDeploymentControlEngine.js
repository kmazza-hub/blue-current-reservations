(function(){"use strict";
class BlueCurrentAIPDeploymentControlEngine{
 constructor(eventBus){this.eventBus=eventBus;this.agentKey="bluecurrent:v409:agent-definitions";this.key="bluecurrent:v4013:agent-deployments";}
 agents(){try{return JSON.parse(localStorage.getItem(this.agentKey)||"[]");}catch{return[];}}
 deployments(){try{return JSON.parse(localStorage.getItem(this.key)||"[]");}catch{return[];}}
 save(rows){localStorage.setItem(this.key,JSON.stringify(rows.slice(0,100)));}
 current(agentId){return this.deployments().find(x=>x.agentId===agentId)||null;}
 promote(agentId,stage,owner,note){const agent=this.agents().find(x=>x.id===agentId);if(!agent)throw new Error("Agent definition not found.");if(!String(owner||"").trim())throw new Error("Deployment owner is required.");const rows=this.deployments().filter(x=>x.agentId!==agentId);const record={id:`DEPLOY-${Date.now()}`,agentId,agentName:agent.name,stage,owner:String(owner).trim(),note:String(note||"").trim(),updatedAt:new Date().toISOString(),rollbackAllowed:true};rows.unshift(record);this.save(rows);this.eventBus?.emit?.("aip:agent-deployment-changed",record);return record;}
}
window.BlueCurrentAIPDeploymentControlEngine=BlueCurrentAIPDeploymentControlEngine;})();