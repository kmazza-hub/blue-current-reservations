(function(){"use strict";
class BlueCurrentDecisionDependencyEngine{
 constructor(eventBus){this.eventBus=eventBus;this.key="bluecurrent:v415:decision-dependencies";this.decisionKey="bluecurrent:v411:decision-objects";this.items=this.read(this.key);}
 read(key){try{const v=JSON.parse(localStorage.getItem(key)||"[]");return Array.isArray(v)?v:[];}catch{return[];}}
 decisions(){return this.read(this.decisionKey);}
 save(){localStorage.setItem(this.key,JSON.stringify(this.items.slice(0,400)));}
 add(input={}){const upstream=String(input.upstream||"").trim(),downstream=String(input.downstream||"").trim();if(!upstream||!downstream)throw new Error("Select both an upstream and downstream decision.");if(upstream===downstream)throw new Error("A decision cannot depend on itself.");const item={id:`DEP-${Date.now()}`,upstream,downstream,effect:String(input.effect||"enables").trim(),strength:Math.max(1,Math.min(100,Number(input.strength)||70)),risk:String(input.risk||"medium"),status:"unverified",createdAt:new Date().toISOString()};this.items.unshift(item);this.save();this.eventBus?.emit?.("aip:decision-dependency-created",item);return item;}
 verify(id){const x=this.items.find(d=>d.id===id);if(!x)return null;x.status="verified";x.verifiedAt=new Date().toISOString();this.save();this.eventBus?.emit?.("aip:decision-dependency-verified",x);return x;}
 summary(){return{total:this.items.length,verified:this.items.filter(x=>x.status==="verified").length,highRisk:this.items.filter(x=>x.risk==="high").length,avgStrength:this.items.length?Math.round(this.items.reduce((a,b)=>a+b.strength,0)/this.items.length):0};}
}
window.BlueCurrentDecisionDependencyEngine=BlueCurrentDecisionDependencyEngine;})();
