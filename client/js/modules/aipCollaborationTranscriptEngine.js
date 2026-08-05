(function(){"use strict";
class BlueCurrentAIPCollaborationTranscriptEngine{
 constructor(eventBus){this.eventBus=eventBus;this.key="bluecurrent:v4025:collaboration-transcript";this.items=this.read();this.unsubs=[];this.bind();}
 read(){try{return JSON.parse(sessionStorage.getItem(this.key)||"[]");}catch{return[];}}
 persist(){sessionStorage.setItem(this.key,JSON.stringify(this.items.slice(0,250)));}
 record(type,payload={}){const item={id:`AIP-COL-${Date.now()}-${Math.random().toString(16).slice(2,6)}`,type,agent:payload.agent||payload.owner||payload.source||"AIP",summary:payload.summary||payload.answer||payload.title||payload.action||payload.prompt||type,evidence:payload.evidence||payload.checks||[],approvalRequired:Boolean(payload.approvalRequired),createdAt:new Date().toISOString()};this.items.unshift(item);this.persist();this.eventBus?.emit?.("aip:transcript-recorded",item);return item;}
 bind(){const events=["aip:agent-response","aip:mission-completed","aip:tool-invoked","aip:approval-requested","aip:task-delegated"];events.forEach(name=>{const off=this.eventBus?.on?.(name,p=>{if(name!=="aip:transcript-recorded")this.record(name,p||{});});if(off)this.unsubs.push(off);});}
 list(filter="all"){return filter==="all"?[...this.items]:this.items.filter(x=>x.type.includes(filter));}
 export(){return{generatedAt:new Date().toISOString(),records:this.list()};}
 clear(){this.items=[];this.persist();}
}
window.BlueCurrentAIPCollaborationTranscriptEngine=BlueCurrentAIPCollaborationTranscriptEngine;})();