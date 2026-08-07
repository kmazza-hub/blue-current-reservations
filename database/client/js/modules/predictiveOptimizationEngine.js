(function(){"use strict";
class BlueCurrentPredictiveOptimizationEngine{
 constructor(eventBus,appState){this.eventBus=eventBus;this.appState=appState;this.key="bluecurrent:v4130:predictive-optimizations";}
 read(k,f=[]){try{return JSON.parse(localStorage.getItem(k)||"null")??f;}catch{return f;}}
 state(){try{return this.appState?.getState?.()||{};}catch{return {};}}
 latest(k){const v=this.read(k,[]);return Array.isArray(v)?v[0]||null:v||null;}
 run(owner){
  const state=this.state(), strategies=this.latest("bluecurrent:v4127:adaptive-strategies"), tradeoffs=this.latest("bluecurrent:v4128:decision-tradeoffs"), forecast=this.latest("bluecurrent:v4113:decision-horizon-forecasts");
  const wait=Number(state.guestWaitMinutes??state.guestWait??forecast?.projected?.guestWait??0);
  const kitchen=Number(state.kitchenPressure??forecast?.projected?.kitchenPressure??0);
  const labor=Number(state.laborPercent??state.laborPercentage??forecast?.projected?.laborPercent??0);
  const occupancy=Number(state.occupancyPercent??state.occupancy??0);
  const source=(strategies?.strategies||[]).map(s=>({...s,tradeoff:(tradeoffs?.options||[]).find(o=>o.strategyId===s.id)}));
  const candidates=source.length?source:[
   {id:"OPT-STABILIZE",name:"Stabilize flow",risk:"low",confidence:82,value:64,summary:"Protect kitchen and guest experience before adding demand."},
   {id:"OPT-BALANCE",name:"Balance capacity",risk:"medium",confidence:78,value:76,summary:"Coordinate seating, labor, and production capacity."}
  ];
  const scored=candidates.map((c,i)=>{
   const guestGain=Math.max(0,Math.round((wait>20?18:8)+(c.name==="Balanced"?6:0)));
   const throughputGain=Math.max(0,Math.round((occupancy>85?10:5)+(kitchen<88?8:0)));
   const laborCost=Math.max(0,Math.round((c.risk==="high"?14:c.risk==="medium"?8:3)+(labor>34?5:0)));
   const riskPenalty=c.risk==="high"?18:c.risk==="medium"?9:3;
   const score=Math.max(0,Math.min(100,Math.round((c.value||60)*.38+(c.confidence||70)*.28+guestGain*.18+throughputGain*.16-laborCost*.12-riskPenalty*.12)));
   return {strategyId:c.id,name:c.name||`Option ${i+1}`,score,guestGain,throughputGain,laborCost,risk:c.risk||"medium",confidence:c.confidence||70,summary:c.summary||"Governed operating option."};
  }).sort((a,b)=>b.score-a.score);
  const best=scored[0];
  const result={id:`V41-OPT-${Date.now()}`,owner:String(owner||"Optimization owner").trim(),status:best.score>=80?"optimized":best.score>=65?"controlled":"review",recommended:best,options:scored,inputs:{wait,kitchen,labor,occupancy,forecastId:forecast?.id||null,strategyId:strategies?.id||null},createdAt:new Date().toISOString()};
  const h=this.read(this.key,[]);h.unshift(result);localStorage.setItem(this.key,JSON.stringify(h.slice(0,30)));this.eventBus?.emit?.("predictive-optimization:completed",result);return result;
 }
 history(){return this.read(this.key,[]);}
}
window.BlueCurrentPredictiveOptimizationEngine=BlueCurrentPredictiveOptimizationEngine;})();