(function(){"use strict";
class BlueCurrentAgentNegotiationEngine{
 constructor(eventBus){this.eventBus=eventBus;this.key="bluecurrent:v4131:agent-negotiations";}
 read(k,f=[]){try{return JSON.parse(localStorage.getItem(k)||"null")??f;}catch{return f;}}
 latest(k){const v=this.read(k,[]);return Array.isArray(v)?v[0]||null:v||null;}
 negotiate(owner){
  const optimization=this.latest("bluecurrent:v4130:predictive-optimizations"), reasoning=this.latest("bluecurrent:v416:operational-reasoning")||this.latest("bluecurrent:v416:reasoning-results");
  const preferred=optimization?.recommended||{};
  const positions=[
   {agent:"Operations Agent",priority:"guest flow",support:Math.min(96,(preferred.score||70)+4),position:`Adopt ${preferred.name||"the preferred plan"} with a 15-minute verification checkpoint.`},
   {agent:"Kitchen Agent",priority:"throughput protection",support:Math.max(45,(preferred.score||70)-(preferred.risk==="high"?14:3)),position:"Preserve production capacity and pace seating if kitchen pressure rises."},
   {agent:"Labor Agent",priority:"cost discipline",support:Math.max(42,88-(preferred.laborCost||8)*3),position:"Use named temporary ownership before adding labor hours."},
   {agent:"Guest Experience Agent",priority:"wait reduction",support:Math.min(98,65+(preferred.guestGain||8)),position:"Prioritize the intervention that most directly lowers guest wait."}
  ];
  const spread=Math.max(...positions.map(x=>x.support))-Math.min(...positions.map(x=>x.support));
  const consensus=Math.round(positions.reduce((a,b)=>a+b.support,0)/positions.length);
  const result={id:`V41-NEG-${Date.now()}`,owner:String(owner||"Decision facilitator").trim(),status:spread<=12?"consensus":spread<=24?"aligned-with-conditions":"disputed",consensus,spread,positions,resolution:{strategy:preferred.name||"Balanced",conditions:["Human approval remains required","Verify kitchen pressure after execution","Record measured guest and labor outcomes"],reasoningId:reasoning?.id||null},createdAt:new Date().toISOString()};
  const h=this.read(this.key,[]);h.unshift(result);localStorage.setItem(this.key,JSON.stringify(h.slice(0,30)));this.eventBus?.emit?.("agent-negotiation:completed",result);return result;
 }
 history(){return this.read(this.key,[]);}
}
window.BlueCurrentAgentNegotiationEngine=BlueCurrentAgentNegotiationEngine;})();