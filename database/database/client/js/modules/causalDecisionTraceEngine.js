(function(){"use strict";
class BlueCurrentCausalDecisionTraceEngine{
 constructor(eventBus){this.eventBus=eventBus;this.decisionKey="bluecurrent:v411:decision-objects";this.traceKey="bluecurrent:v412:causal-traces";this.traces=this.read(this.traceKey);}
 read(key){try{const v=JSON.parse(localStorage.getItem(key)||"[]");return Array.isArray(v)?v:[];}catch{return[];}}
 decisions(){return this.read(this.decisionKey);}
 save(){localStorage.setItem(this.traceKey,JSON.stringify(this.traces.slice(0,250)));}
 build(decisionId){const d=this.decisions().find(x=>x.id===decisionId);if(!d)throw new Error("Select a decision object.");const causes=(d.evidence||[]).map(e=>({label:`${e.key}: ${e.value}`,kind:"evidence"}));if(!causes.length)causes.push({label:"Manager-entered operating context",kind:"evidence"});const trace={id:`TRACE-${Date.now()}`,decisionId:d.id,title:d.title,causes,decision:{label:d.title,owner:d.owner,approvalRequired:d.approvalRequired},effects:[{label:d.expectedOutcome||"Outcome not yet recorded",kind:"expected-outcome"},{label:`Current status: ${d.status}`,kind:"governance"}],confidence:Math.min(95,55+causes.length*8+(d.status==="approved"?10:0)),createdAt:new Date().toISOString()};this.traces.unshift(trace);this.save();this.eventBus?.emit?.("aip:causal-trace-created",trace);return trace;}
 latest(){return this.traces[0]||null;}
}
window.BlueCurrentCausalDecisionTraceEngine=BlueCurrentCausalDecisionTraceEngine;})();