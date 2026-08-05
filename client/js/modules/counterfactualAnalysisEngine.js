(function(){"use strict";
class BlueCurrentCounterfactualAnalysisEngine{
 constructor(eventBus,appState){this.eventBus=eventBus;this.appState=appState;this.historyKey="bluecurrent:v417:counterfactual-history";}
 read(){try{return JSON.parse(localStorage.getItem(this.historyKey)||"[]");}catch{return[];}}
 write(v){localStorage.setItem(this.historyKey,JSON.stringify(v.slice(0,24)));}
 state(){return this.appState?.getState?.()||this.appState?.state||{};}
 simulate(input={}){const s=this.state(),scenario=String(input.scenario||"").toLowerCase(),magnitude=Math.max(1,Math.min(30,Number(input.magnitude)||10));let wait=Number(s.guestWaitMinutes||s.averageWaitMinutes||18),kitchen=Number(s.kitchenLoad||s.kitchenPressure||72),labor=Number(s.laborPercent||s.laborPercentage||31),revenue=100,occupancy=Number(s.occupancyPercent||s.occupancy||78);const effects=[];
  if(/patio|capacity|table/.test(scenario)){occupancy=Math.min(100,occupancy+magnitude*.45);wait=Math.max(0,wait-magnitude*.55);kitchen=Math.min(100,kitchen+magnitude*.35);revenue+=magnitude*.7;effects.push("Adds seating capacity but transfers pressure toward the kitchen.");}
  else if(/host|staff|labor/.test(scenario)){wait=Math.max(0,wait-magnitude*.45);labor=Math.min(100,labor+magnitude*.22);revenue+=magnitude*.25;effects.push("Improves arrival throughput while increasing labor exposure.");}
  else if(/slow|pace|throttle|delay/.test(scenario)){wait+=magnitude*.28;kitchen=Math.max(0,kitchen-magnitude*.62);revenue-=magnitude*.18;effects.push("Protects production capacity but may extend quoted wait time.");}
  else {wait=Math.max(0,wait-magnitude*.2);kitchen=Math.max(0,kitchen-magnitude*.18);revenue+=magnitude*.15;effects.push("Produces a modest directional improvement with limited evidence.");}
  const risk=Math.round(Math.max(0,Math.min(100,(kitchen*.45)+(wait*1.4)+(labor*.35)-32)));const result={id:`CF-${Date.now()}`,scenario:input.scenario||"Operational adjustment",magnitude,baseline:{wait:Number(s.guestWaitMinutes||s.averageWaitMinutes||18),kitchen:Number(s.kitchenLoad||s.kitchenPressure||72),labor:Number(s.laborPercent||s.laborPercentage||31),occupancy:Number(s.occupancyPercent||s.occupancy||78),revenueIndex:100},projected:{wait:Math.round(wait),kitchen:Math.round(kitchen),labor:Math.round(labor),occupancy:Math.round(occupancy),revenueIndex:Math.round(revenue),risk},effects,confidence:72,createdAt:new Date().toISOString()};const h=this.read();h.unshift(result);this.write(h);this.eventBus?.emit?.("aip:counterfactual-complete",result);return result;}
}
window.BlueCurrentCounterfactualAnalysisEngine=BlueCurrentCounterfactualAnalysisEngine;})();
