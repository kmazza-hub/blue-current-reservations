(function(){"use strict";
class BlueCurrentReasoningBenchmarkEngine{
  constructor(eventBus){this.eventBus=eventBus;this.key="bluecurrent:v4124:reasoning-benchmarks";}
  read(key,fallback=[]){try{return JSON.parse(localStorage.getItem(key)||"null")??fallback;}catch{return fallback;}}
  latest(key){const value=this.read(key,[]);return Array.isArray(value)?value[0]||null:value||null;}
  run(owner){
    const cert=this.latest("bluecurrent:v4123:certifications");
    const reasoning=this.latest("bluecurrent:v416:reasoning-results");
    const forecast=this.latest("bluecurrent:v4113:decision-horizon-forecasts");
    const verification=this.latest("bluecurrent:v4111:plan-verifications");
    const outcome=this.latest("bluecurrent:v4122:enterprise-outcomes");
    const tests=[
      {name:"V41 certification evidence",pass:cert?.status==="certified",weight:25},
      {name:"Operational reasoning available",pass:!!reasoning,weight:20},
      {name:"Decision horizon forecast available",pass:!!forecast,weight:15},
      {name:"Plan verification controlled",pass:["verified","conditional"].includes(verification?.status),weight:20},
      {name:"Enterprise outcome verified",pass:outcome?.status==="verified",weight:20}
    ];
    const score=tests.reduce((s,t)=>s+(t.pass?t.weight:0),0);
    const result={id:`V41-BENCH-${Date.now()}`,owner:String(owner||"").trim(),score,status:score>=90?"production-grade":score>=70?"controlled":"needs-evidence",tests,createdAt:new Date().toISOString()};
    const h=this.read(this.key,[]);h.unshift(result);localStorage.setItem(this.key,JSON.stringify(h.slice(0,30)));this.eventBus?.emit?.("reasoning:benchmark-complete",result);return result;
  }
  history(){return this.read(this.key,[]);}
}
window.BlueCurrentReasoningBenchmarkEngine=BlueCurrentReasoningBenchmarkEngine;})();