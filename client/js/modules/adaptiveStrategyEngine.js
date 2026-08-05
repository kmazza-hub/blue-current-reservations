(function(){"use strict";
class BlueCurrentAdaptiveStrategyEngine{
 constructor(eventBus,appState){this.eventBus=eventBus;this.appState=appState;this.key="bluecurrent:v4127:adaptive-strategies";}
 read(k,f=[]){try{return JSON.parse(localStorage.getItem(k)||"null")??f;}catch{return f;}}
 state(){try{return this.appState?.getState?.()||{};}catch{return {};}}
 latest(k){const v=this.read(k,[]);return Array.isArray(v)?v[0]||null:v||null;}
 generate(owner){const s=this.state(),reason=this.latest("bluecurrent:v416:operational-reasoning")||this.latest("bluecurrent:v416:reasoning-results"),forecast=this.latest("bluecurrent:v4113:decision-horizon-forecasts"),constraints=this.latest("bluecurrent:v4118:enterprise-constraints");
 const wait=Number(s.guestWaitMinutes??s.guestWait??reason?.signals?.guestWait??0), kitchen=Number(s.kitchenPressure??reason?.signals?.kitchenPressure??0), labor=Number(s.laborPercent??s.laborPercentage??reason?.signals?.labor??0);
 const base=Math.max(35,Math.min(96,Math.round(78-(wait>20?10:0)-(kitchen>80?8:0)-(labor>34?6:0)+(forecast?.confidence||0)*.08)));
 const strategies=[
 {id:`STRAT-CONS-${Date.now()}`,name:"Conservative",risk:"low",confidence:Math.min(96,base+8),value:Math.max(20,base-20),approval:true,summary:"Stabilize current constraints before increasing demand or operational complexity.",actions:["Confirm staffing and kitchen capacity","Slow seating pace where pressure is concentrated","Review results before the next demand wave"]},
 {id:`STRAT-BAL-${Date.now()}`,name:"Balanced",risk:"medium",confidence:base,value:Math.min(96,base+5),approval:true,summary:"Improve guest flow while protecting labor and kitchen throughput.",actions:["Apply the highest-leverage verified decision","Coordinate one supporting owner","Measure guest-wait and throughput movement"]},
 {id:`STRAT-AGG-${Date.now()}`,name:"Aggressive",risk:"high",confidence:Math.max(45,base-12),value:Math.min(99,base+18),approval:true,summary:"Pursue maximum short-term operating improvement with explicit executive oversight.",actions:["Activate the preferred portfolio intervention","Add temporary capacity where constraints allow","Verify downstream effects within 15 minutes"]}
 ];
 const recommended=(wait>25||kitchen>88||constraints?.status==="constrained")?strategies[0]:strategies[1];
 const result={id:`V41-STRATEGY-${Date.now()}`,owner:String(owner||"Operations leader").trim(),recommendedId:recommended.id,recommendedName:recommended.name,strategies,inputs:{wait,kitchen,labor,reasoningId:reason?.id||null,forecastId:forecast?.id||null},createdAt:new Date().toISOString()};
 const h=this.read(this.key,[]);h.unshift(result);localStorage.setItem(this.key,JSON.stringify(h.slice(0,30)));this.eventBus?.emit?.("adaptive-strategy:generated",result);return result;}
 history(){return this.read(this.key,[]);}}
window.BlueCurrentAdaptiveStrategyEngine=BlueCurrentAdaptiveStrategyEngine;})();