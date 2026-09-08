(function(){"use strict";
class BlueCurrentAIPModelRoutingEngine{
 constructor(eventBus){this.eventBus=eventBus;this.key="bluecurrent:v4016:model-routing";this.history=this.read();}
 read(){try{return JSON.parse(sessionStorage.getItem(this.key)||"[]");}catch{return[];}}
 persist(){sessionStorage.setItem(this.key,JSON.stringify(this.history.slice(0,100)));}
 route(input={}){const risk=String(input.risk||"low"),complexity=String(input.complexity||"standard"),latency=String(input.latency||"balanced");let profile="balanced";let reason="Balanced reasoning and response time.";if(risk==="high"||complexity==="deep"){profile="deep";reason="Higher-risk or complex work requires deeper analysis and stricter approval.";}else if(latency==="fast"&&risk==="low"&&complexity==="simple"){profile="fast";reason="Low-risk, simple work can use the fast operating profile.";}const approvalRequired=risk==="high"||/write|execute|change/i.test(String(input.task||""));const result={id:`ROUTE-${Date.now()}`,task:String(input.task||"Operational request").trim(),risk,complexity,latency,profile,approvalRequired,reason,createdAt:new Date().toISOString()};this.history.unshift(result);this.persist();this.eventBus?.emit?.("aip:model-routed",result);return result;}
 snapshot(){return{routes:this.history.length,deep:this.history.filter(x=>x.profile==="deep").length,approval:this.history.filter(x=>x.approvalRequired).length,history:this.history.slice(0,30)};}
}
window.BlueCurrentAIPModelRoutingEngine=BlueCurrentAIPModelRoutingEngine;})();