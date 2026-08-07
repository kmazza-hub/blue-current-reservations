(function(){"use strict";
class BlueCurrentAIPExecutionQueueEngine{
 constructor(eventBus){this.eventBus=eventBus;this.key="bluecurrent:v4040:execution-queue";this.items=this.read();}
 read(){try{const value=JSON.parse(localStorage.getItem(this.key)||"[]");return Array.isArray(value)?value:[];}catch{return[];}}
 save(){localStorage.setItem(this.key,JSON.stringify(this.items.slice(0,200)));}
 enqueue(input={}){const planId=String(input.planId||"").trim();const action=String(input.action||"").trim();if(!planId&&!action)throw new Error("Provide an execution plan ID or action.");const mode=input.mode==="governed-live"?"governed-live":"simulation";const item={id:`AIP-QUEUE-${Date.now()}`,planId:planId||"ad-hoc",action:action||"Execute governed plan",owner:String(input.owner||"Manager").trim(),mode,status:mode==="governed-live"?"approval-pending":"ready",createdAt:new Date().toISOString(),history:[]};item.history.push({status:item.status,at:item.createdAt,owner:item.owner});this.items.unshift(item);this.save();this.eventBus?.emit?.("aip:execution-queued",item);return item;}
 setStatus(id,status){const allowed=["ready","approval-pending","approved","completed","cancelled"];if(!allowed.includes(status))return null;const item=this.items.find(x=>x.id===id);if(!item)return null;item.status=status;item.updatedAt=new Date().toISOString();item.history.push({status,at:item.updatedAt,owner:item.owner});this.save();this.eventBus?.emit?.("aip:execution-queue-updated",{...item});return item;}
}
window.BlueCurrentAIPExecutionQueueEngine=BlueCurrentAIPExecutionQueueEngine;})();
