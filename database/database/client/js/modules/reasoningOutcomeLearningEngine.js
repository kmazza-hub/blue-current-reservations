(function(){"use strict";
class BlueCurrentReasoningOutcomeLearningEngine{
 constructor(eventBus){this.eventBus=eventBus;this.key="bluecurrent:v4137:outcome-learning";}
 read(k,f=[]){try{return JSON.parse(localStorage.getItem(k)||"null")??f;}catch{return f;}}
 latest(k){const v=this.read(k,[]);return Array.isArray(v)?v[0]||null:v||null;}
 record(owner,result,note){
  const telemetry=this.latest("bluecurrent:v4136:pilot-telemetry"),optimization=this.latest("bluecurrent:v4130:predictive-optimizations"),benchmark=this.latest("bluecurrent:v4124:reasoning-benchmarks");
  const outcome=String(result||"effective");const accuracy=outcome==="effective"?100:outcome==="partial"?70:35;
  const checks=[
   {name:"Pilot telemetry available",pass:!!telemetry,detail:telemetry?.id||"No telemetry"},
   {name:"Optimized strategy traceable",pass:!!optimization?.recommended,detail:optimization?.recommended?.name||"No optimized strategy"},
   {name:"Reasoning benchmark available",pass:!!benchmark,detail:benchmark?.id||"No benchmark"},
   {name:"Human reviewer assigned",pass:!!String(owner||"").trim(),detail:String(owner||"Unassigned")},
   {name:"Outcome evidence recorded",pass:!!String(note||"").trim(),detail:String(note||"No outcome note")}
  ];
  const evidence=Math.round(checks.filter(x=>x.pass).length/checks.length*100),score=Math.round((accuracy*.6)+(evidence*.4));
  const item={id:`V41-LEARN-${Date.now()}`,owner:String(owner||"Reasoning reviewer").trim(),result:outcome,note:String(note||"").trim(),score,status:score>=90?"validated":score>=70?"learning":"rework",telemetryId:telemetry?.id||null,strategy:optimization?.recommended?.name||null,benchmarkId:benchmark?.id||null,checks,createdAt:new Date().toISOString()};
  const h=this.read(this.key,[]);h.unshift(item);localStorage.setItem(this.key,JSON.stringify(h.slice(0,100)));this.eventBus?.emit?.("v41:reasoning-outcome-recorded",item);return item;
 }
 history(){return this.read(this.key,[]);}
}
window.BlueCurrentReasoningOutcomeLearningEngine=BlueCurrentReasoningOutcomeLearningEngine;})();