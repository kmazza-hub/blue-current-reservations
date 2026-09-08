(function(){"use strict";
class BlueCurrentV41EnterpriseReleaseEngine{
 constructor(eventBus){this.eventBus=eventBus;this.key="bluecurrent:v4138:enterprise-release";}
 read(k,f=[]){try{return JSON.parse(localStorage.getItem(k)||"null")??f;}catch{return f;}}
 latest(k){const v=this.read(k,[]);return Array.isArray(v)?v[0]||null:v||null;}
 certify(owner){
  const pilot=this.latest("bluecurrent:v4135:pilot-certifications"),telemetry=this.latest("bluecurrent:v4136:pilot-telemetry"),learning=this.latest("bluecurrent:v4137:outcome-learning"),readiness=this.latest("bluecurrent:v4132:production-readiness"),drift=this.latest("bluecurrent:v4125:reasoning-drift");
  const checks=[
   {name:"Pilot intelligence certified",pass:!!pilot&&Number(pilot.score||0)>=80,detail:pilot?.id||"No pilot certification"},
   {name:"Live pilot telemetry captured",pass:!!telemetry&&telemetry.status!=="incomplete",detail:telemetry?.id||"No telemetry"},
   {name:"Reasoning outcome validated",pass:!!learning&&learning.status!=="rework",detail:learning?.id||"No outcome learning"},
   {name:"Production readiness controlled",pass:!!readiness&&Number(readiness.score||0)>=80,detail:readiness?.id||"No readiness gate"},
   {name:"Reasoning drift contained",pass:!drift||drift.status!=="drift-detected",detail:drift?.status||"No active drift"},
   {name:"Enterprise release owner assigned",pass:!!String(owner||"").trim(),detail:String(owner||"Unassigned")}
  ];
  const score=Math.round(checks.filter(x=>x.pass).length/checks.length*100),blockers=checks.filter(x=>!x.pass).length;
  const cert={id:`V41-REL-${Date.now()}`,owner:String(owner||"Enterprise release owner").trim(),score,status:score===100?"enterprise-ready":score>=80?"conditional":"blocked",blockers,checks,pilotId:pilot?.id||null,telemetryId:telemetry?.id||null,learningId:learning?.id||null,build:document.querySelector('meta[name="blue-current-build"]')?.content||"unknown",createdAt:new Date().toISOString()};
  const h=this.read(this.key,[]);h.unshift(cert);localStorage.setItem(this.key,JSON.stringify(h.slice(0,30)));this.eventBus?.emit?.("v41:enterprise-release-certified",cert);return cert;
 }
 history(){return this.read(this.key,[]);}
}
window.BlueCurrentV41EnterpriseReleaseEngine=BlueCurrentV41EnterpriseReleaseEngine;})();