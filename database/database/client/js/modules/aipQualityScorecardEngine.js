(function(){"use strict";
class BlueCurrentAIPQualityScorecardEngine{
 constructor(eventBus){this.eventBus=eventBus;this.key="bluecurrent:v4022:quality-scorecard";this.history=this.read();}
 read(){try{return JSON.parse(localStorage.getItem(this.key)||"[]");}catch{return[];}}
 persist(){localStorage.setItem(this.key,JSON.stringify(this.history.slice(0,50)));}
 evaluate(context={}){const metrics=[
  {id:"evaluation",label:"Agent evaluation quality",score:Number(context.evaluation?.score??context.evaluation?.overall??0)},
  {id:"safety",label:"Governance safety",score:Number(context.safety?.score??0)},
  {id:"evidence",label:"Evidence coverage",score:Math.min(100,(context.evidence?.length||0)*10)},
  {id:"deployment",label:"Governed deployment",score:(context.deployments||[]).length?Math.round((context.deployments.filter(x=>x.owner||x.deploymentOwner).length/context.deployments.length)*100):75},
  {id:"observability",label:"Runtime observability",score:Number(context.observability?.score??context.observability?.healthScore??80)}
 ];const score=Math.round(metrics.reduce((s,x)=>s+x.score,0)/metrics.length);const report={id:`AIP-QLT-${Date.now()}`,score,status:score>=90?"Excellent":score>=80?"Controlled":score>=65?"Watch":"Needs work",metrics,createdAt:new Date().toISOString()};this.history.unshift(report);this.persist();this.eventBus?.emit?.("aip:quality-evaluated",report);return report;}
 latest(){return this.history[0]||null;}
}
window.BlueCurrentAIPQualityScorecardEngine=BlueCurrentAIPQualityScorecardEngine;})();