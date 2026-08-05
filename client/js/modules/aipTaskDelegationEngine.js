(function(){"use strict";
class BlueCurrentAIPTaskDelegationEngine{
 constructor(eventBus){this.eventBus=eventBus;this.key="bluecurrent:v4024:delegations";this.items=this.read();}
 read(){try{return JSON.parse(localStorage.getItem(this.key)||"[]");}catch{return[];}}
 persist(){localStorage.setItem(this.key,JSON.stringify(this.items.slice(0,200)));}
 create(input={}){const title=String(input.title||"").trim();const owner=String(input.owner||"").trim();if(title.length<6)throw new Error("Describe a clear delegated task.");if(!owner)throw new Error("Assign a named owner.");const item={id:`AIP-TASK-${Date.now()}`,title,owner,priority:String(input.priority||"normal"),dueAt:String(input.dueAt||""),source:String(input.source||"manager"),approvalId:String(input.approvalId||""),status:"open",createdAt:new Date().toISOString(),history:[{status:"open",at:new Date().toISOString(),by:"Blue Current AIP"}]};this.items.unshift(item);this.persist();this.eventBus?.emit?.("aip:task-delegated",item);return item;}
 update(id,status,by="Manager"){const item=this.items.find(x=>x.id===id);if(!item)return null;item.status=status;item.updatedAt=new Date().toISOString();item.history.unshift({status,at:item.updatedAt,by});this.persist();this.eventBus?.emit?.("aip:task-updated",item);return item;}
 list(){return [...this.items];}
 summary(){const all=this.items;return{total:all.length,open:all.filter(x=>x.status==="open").length,inProgress:all.filter(x=>x.status==="in-progress").length,complete:all.filter(x=>x.status==="complete").length};}
}
window.BlueCurrentAIPTaskDelegationEngine=BlueCurrentAIPTaskDelegationEngine;})();