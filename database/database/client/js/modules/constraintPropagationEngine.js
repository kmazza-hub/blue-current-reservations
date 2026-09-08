(function(){"use strict";
class BlueCurrentConstraintPropagationEngine{
 constructor(eventBus){this.eventBus=eventBus;this.twinKey="bluecurrent:v419:operational-twin";this.depKey="bluecurrent:v415:decision-dependencies";this.cfKey="bluecurrent:v417:counterfactual-history";this.historyKey="bluecurrent:v4110:constraint-propagation";}
 read(key,fallback=[]){try{const value=JSON.parse(localStorage.getItem(key)||"null");return value??fallback;}catch{return fallback;}}
 write(value){localStorage.setItem(this.historyKey,JSON.stringify(value.slice(0,30)));}
 propagate(change="Open patio capacity",magnitude=10){const twin=this.read(this.twinKey,null),deps=this.read(this.depKey,[]),cf=this.read(this.cfKey,[])[0];const n=Math.max(1,Number(magnitude)||10);const lower=String(change).toLowerCase();
  const effects=[];if(lower.includes("patio")||lower.includes("seat")){effects.push({target:"Occupancy",direction:"increase",amount:Math.round(n*.7),risk:"medium"},{target:"Guest wait",direction:"decrease",amount:Math.round(n*.5),risk:"low"},{target:"Kitchen pressure",direction:"increase",amount:Math.round(n*.35),risk:"high"});}
  else if(lower.includes("host")){effects.push({target:"Guest wait",direction:"decrease",amount:Math.round(n*.6),risk:"low"},{target:"Labor",direction:"increase",amount:Math.max(1,Math.round(n*.15)),risk:"medium"});}
  else if(lower.includes("kitchen")){effects.push({target:"Kitchen pressure",direction:"decrease",amount:Math.round(n*.6),risk:"low"},{target:"Labor",direction:"increase",amount:Math.max(1,Math.round(n*.2)),risk:"medium"});}
  else{effects.push({target:"Operating risk",direction:"decrease",amount:Math.round(n*.3),risk:"medium"});}
  deps.slice(0,5).forEach(d=>effects.push({target:d.downstreamTitle||d.downstream||"Dependent decision",direction:d.effect||"influences",amount:Number(d.strength||50),risk:d.risk||"medium",dependency:true}));
  const highRisk=effects.filter(x=>x.risk==="high").length,confidence=Math.min(95,60+(twin?12:0)+Math.min(12,deps.length*2)+(cf?5:0));const result={id:`PROP-${Date.now()}`,change,magnitude:n,effects,highRisk,confidence,status:highRisk?"review-required":"contained",twinId:twin?.id||null,createdAt:new Date().toISOString()};const history=this.read(this.historyKey,[]);history.unshift(result);this.write(history);this.eventBus?.emit?.("aip:constraints-propagated",result);return result;}
 history(){return this.read(this.historyKey,[]);}
}
window.BlueCurrentConstraintPropagationEngine=BlueCurrentConstraintPropagationEngine;})();