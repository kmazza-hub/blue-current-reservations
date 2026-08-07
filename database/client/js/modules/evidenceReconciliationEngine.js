(function(){"use strict";
class BlueCurrentEvidenceReconciliationEngine{
 constructor(eventBus){this.eventBus=eventBus;this.key="bluecurrent:v4140:evidence-reconciliation";}
 read(k,f=[]){try{return JSON.parse(localStorage.getItem(k)||"null")??f;}catch{return f;}}
 latest(k){const v=this.read(k,[]);return Array.isArray(v)?v[0]||null:v||null;}
 run(owner){const now=Date.now(),build=document.querySelector('meta[name="blue-current-build"]')?.content||"unknown";
  const release=this.latest("bluecurrent:v4138:enterprise-release"),telemetry=this.latest("bluecurrent:v4136:pilot-telemetry"),learning=this.latest("bluecurrent:v4137:outcome-learning"),consoleRecord=this.latest("bluecurrent:v4139:enterprise-console");
  const ageHours=x=>x?.createdAt?Math.round((now-new Date(x.createdAt).getTime())/36e5):9999;
  const checks=[
   {name:"Build identity aligned",pass:!!release&&release.build===build,detail:`release ${release?.build||'none'} / current ${build}`},
   {name:"Telemetry linked",pass:!!telemetry&&(!release?.telemetryId||release.telemetryId===telemetry.id),detail:telemetry?.id||"Missing"},
   {name:"Learning linked",pass:!!learning&&(!release?.learningId||release.learningId===learning.id),detail:learning?.id||"Missing"},
   {name:"Decision console current",pass:!!consoleRecord&&ageHours(consoleRecord)<=24,detail:consoleRecord?`${ageHours(consoleRecord)}h old`:"Missing"},
   {name:"Enterprise release current",pass:!!release&&ageHours(release)<=72,detail:release?`${ageHours(release)}h old`:"Missing"},
   {name:"Reconciliation owner assigned",pass:!!String(owner||"").trim(),detail:String(owner||"Unassigned")}
  ];
  const score=Math.round(checks.filter(x=>x.pass).length/checks.length*100),exceptions=checks.filter(x=>!x.pass).length;
  const r={id:`V41-REC-${Date.now()}`,owner:String(owner||"Evidence owner").trim(),score,status:score===100?"reconciled":score>=80?"review":"exception",exceptions,checks,build,createdAt:new Date().toISOString()};const h=this.read(this.key,[]);h.unshift(r);localStorage.setItem(this.key,JSON.stringify(h.slice(0,30)));this.eventBus?.emit?.("v41:evidence-reconciled",r);return r;}
 history(){return this.read(this.key,[]);}
}
window.BlueCurrentEvidenceReconciliationEngine=BlueCurrentEvidenceReconciliationEngine;})();
