(function(){"use strict";
class BlueCurrentV41ClosureCertificationEngine{
 constructor(eventBus){this.eventBus=eventBus;this.key="bluecurrent:v4141:closure-certification";}
 read(k,f=[]){try{return JSON.parse(localStorage.getItem(k)||"null")??f;}catch{return f;}}
 latest(k){const v=this.read(k,[]);return Array.isArray(v)?v[0]||null:v||null;}
 certify(owner){const release=this.latest("bluecurrent:v4138:enterprise-release"),decision=this.latest("bluecurrent:v4139:enterprise-console"),recon=this.latest("bluecurrent:v4140:evidence-reconciliation"),benchmark=this.latest("bluecurrent:v4124:reasoning-benchmark"),drift=this.latest("bluecurrent:v4125:reasoning-drift");
  const checks=[
   {name:"Enterprise reasoning released",pass:!!release&&Number(release.score||0)>=80,detail:release?.id||"Missing release"},
   {name:"Executive decision layer ready",pass:!!decision&&Number(decision.score||0)>=80,detail:decision?.id||"Missing decision console"},
   {name:"Evidence reconciled",pass:!!recon&&recon.status==="reconciled",detail:recon?.id||"Missing reconciliation"},
   {name:"Reasoning benchmark controlled",pass:!!benchmark&&Number(benchmark.score||0)>=80,detail:benchmark?.id||"Missing benchmark"},
   {name:"Reasoning drift contained",pass:!drift||drift.status!=="drift-detected",detail:drift?.status||"No active drift"},
   {name:"Closure owner assigned",pass:!!String(owner||"").trim(),detail:String(owner||"Unassigned")}
  ];const score=Math.round(checks.filter(x=>x.pass).length/checks.length*100),blockers=checks.filter(x=>!x.pass).length;
  const r={id:`V41-CLOSE-${Date.now()}`,owner:String(owner||"V41 release owner").trim(),score,status:score===100?"v41-complete":score>=80?"conditional":"blocked",blockers,checks,releaseId:release?.id||null,decisionId:decision?.id||null,reconciliationId:recon?.id||null,build:document.querySelector('meta[name="blue-current-build"]')?.content||"unknown",createdAt:new Date().toISOString()};const h=this.read(this.key,[]);h.unshift(r);localStorage.setItem(this.key,JSON.stringify(h.slice(0,30)));this.eventBus?.emit?.("v41:closure-certified",r);return r;}
 history(){return this.read(this.key,[]);}
}
window.BlueCurrentV41ClosureCertificationEngine=BlueCurrentV41ClosureCertificationEngine;})();
