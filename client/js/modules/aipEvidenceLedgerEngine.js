(function(){"use strict";
class BlueCurrentAIPEvidenceLedgerEngine{
 constructor(eventBus){this.eventBus=eventBus;this.key="bluecurrent:v4018:evidence-ledger";this.entries=this.read();this.bound=false;}
 read(){try{return JSON.parse(localStorage.getItem(this.key)||"[]");}catch{return[];}}
 persist(){localStorage.setItem(this.key,JSON.stringify(this.entries.slice(0,250)));}
 record(type,payload={}){const evidence=payload.evidence||payload.sources||payload.context||null;const entry={id:`EVD-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,type,agent:payload.agent||payload.agentId||payload.owner||"system",summary:String(payload.summary||payload.answer||payload.task||payload.prompt||type).slice(0,240),evidence,evidenceCount:Array.isArray(evidence)?evidence.length:evidence?1:0,approvalRequired:Boolean(payload.approvalRequired||payload.requiresApproval),createdAt:new Date().toISOString()};this.entries.unshift(entry);this.persist();this.eventBus?.emit?.("aip:evidence-recorded",entry);return entry;}
 bind(){if(this.bound||!this.eventBus?.on)return;this.bound=true;[
  ["aip:agent-response","agent-response"],["aip:mission-complete","mission"],["aip:tool-invoked","tool-call"],["aip:workflow-drafted","workflow"],["aip:routing-complete","routing"],["aip:approval-requested","approval"]
 ].forEach(([event,type])=>this.eventBus.on(event,payload=>this.record(type,payload||{})));}
 list(){return [...this.entries];}
 clear(){this.entries=[];this.persist();this.eventBus?.emit?.("aip:evidence-cleared",{});}
 export(){return {version:"40.18.0",exportedAt:new Date().toISOString(),entries:this.list()};}
}
window.BlueCurrentAIPEvidenceLedgerEngine=BlueCurrentAIPEvidenceLedgerEngine;})();