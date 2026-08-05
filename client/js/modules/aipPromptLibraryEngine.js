(function(){"use strict";
class BlueCurrentAIPPromptLibraryEngine{
 constructor(eventBus){this.eventBus=eventBus;this.key="bluecurrent:v4012:prompt-library";}
 list(){try{return JSON.parse(localStorage.getItem(this.key)||"[]");}catch{return[];}}
 save(rows){localStorage.setItem(this.key,JSON.stringify(rows.slice(0,60)));}
 create(input={}){const name=String(input.name||"").trim(),text=String(input.text||"").trim();if(!name||!text)throw new Error("Prompt name and instruction are required.");const rows=this.list();const prior=rows.filter(x=>x.name.toLowerCase()===name.toLowerCase());const record={id:`PROMPT-${Date.now()}`,name,owner:String(input.owner||"Operations").trim()||"Operations",scope:input.scope||"operations",text,approvalRequired:Boolean(input.approvalRequired),version:prior.length+1,status:"draft",createdAt:new Date().toISOString()};rows.unshift(record);this.save(rows);this.eventBus?.emit?.("aip:prompt-version-created",record);return record;}
 setStatus(id,status){const rows=this.list().map(x=>x.id===id?{...x,status,updatedAt:new Date().toISOString()}:x);this.save(rows);const row=rows.find(x=>x.id===id);this.eventBus?.emit?.("aip:prompt-status-changed",row);return row;}
}
window.BlueCurrentAIPPromptLibraryEngine=BlueCurrentAIPPromptLibraryEngine;})();