(function(){"use strict";
class BlueCurrentAIPAgentBuilderEngine{
 constructor(eventBus){this.eventBus=eventBus;this.key="bluecurrent:v409:agent-definitions";}
 list(){try{return JSON.parse(localStorage.getItem(this.key)||"[]");}catch{return[];}}
 save(rows){localStorage.setItem(this.key,JSON.stringify(rows.slice(0,30)));}
 create(input={}){const name=String(input.name||"").trim();const purpose=String(input.purpose||"").trim();if(!name||!purpose)throw new Error("Agent name and purpose are required.");const tools=[...new Set(input.tools||[])];const agent={id:`AGENT-${Date.now()}`,name,purpose,tools,risk:input.risk||"low",approvalRequired:Boolean(input.approvalRequired),instructions:String(input.instructions||"").trim(),status:"draft",createdAt:new Date().toISOString()};const rows=this.list();rows.unshift(agent);this.save(rows);this.eventBus?.emit?.("aip:agent-drafted",agent);return agent;}
 setStatus(id,status){const rows=this.list().map(a=>a.id===id?{...a,status,updatedAt:new Date().toISOString()}:a);this.save(rows);return rows.find(a=>a.id===id);}
}
window.BlueCurrentAIPAgentBuilderEngine=BlueCurrentAIPAgentBuilderEngine;})();