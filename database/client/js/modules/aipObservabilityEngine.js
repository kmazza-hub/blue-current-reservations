(function(){"use strict";
class BlueCurrentAIPObservabilityEngine{
 constructor(eventBus){this.eventBus=eventBus;this.key="bluecurrent:v4014:aip-telemetry";this.events=this.read();this.unsubs=[];this.bind();}
 read(){try{return JSON.parse(sessionStorage.getItem(this.key)||"[]");}catch{return[];}}
 persist(){sessionStorage.setItem(this.key,JSON.stringify(this.events.slice(0,200)));}
 capture(type,payload={}){this.events.unshift({id:`AIPTEL-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,type,agent:payload.agent||payload.agentId||payload.agentName||"system",tool:payload.tool||payload.toolId||"",approval:Boolean(payload.approvalRequired||payload.status==="pending"),at:new Date().toISOString()});this.events=this.events.slice(0,200);this.persist();}
 bind(){const names=["aip:agent-response","aip:tool-invoked","aip:approval-requested","aip:workflow-drafted","aip:agent-deployment-changed"];names.forEach(name=>{const off=this.eventBus?.on?.(name,p=>this.capture(name,p||{}));if(typeof off==="function")this.unsubs.push(off);});}
 snapshot(){const runs=this.events.filter(x=>/agent-response|deployment/.test(x.type)).length,tools=this.events.filter(x=>/tool-invoked/.test(x.type)).length,holds=this.events.filter(x=>x.approval||/approval-requested|workflow-drafted/.test(x.type)).length;const health=holds>20?"Watch":this.events.length>0?"Healthy":"Awaiting activity";return{runs,tools,holds,health,events:this.events.slice(0,30)};}
 destroy(){this.unsubs.forEach(fn=>fn());}
}
window.BlueCurrentAIPObservabilityEngine=BlueCurrentAIPObservabilityEngine;})();