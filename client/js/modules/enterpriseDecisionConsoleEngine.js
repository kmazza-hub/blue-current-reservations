(function(){"use strict";
class BlueCurrentEnterpriseDecisionConsoleEngine{
 constructor(eventBus){this.eventBus=eventBus;this.key="bluecurrent:v4139:enterprise-console";}
 read(k,f=[]){try{return JSON.parse(localStorage.getItem(k)||"null")??f;}catch{return f;}}
 latest(k){const v=this.read(k,[]);return Array.isArray(v)?v[0]||null:v||null;}
 build(owner){
  const release=this.latest("bluecurrent:v4138:enterprise-release"),telemetry=this.latest("bluecurrent:v4136:pilot-telemetry"),learning=this.latest("bluecurrent:v4137:outcome-learning"),runtime=this.latest("bluecurrent:v4133:decision-runtime"),optimization=this.latest("bluecurrent:v4130:predictive-optimization");
  const checks=[
   {name:"Enterprise release available",pass:!!release&&Number(release.score||0)>=80,detail:release?.id||"No release evidence"},
   {name:"Pilot telemetry current",pass:!!telemetry,detail:telemetry?.id||"No telemetry"},
   {name:"Outcome learning recorded",pass:!!learning&&learning.status!=="rework",detail:learning?.id||"No outcome learning"},
   {name:"Decision runtime controlled",pass:!!runtime&&runtime.status!=="blocked",detail:runtime?.id||"No runtime session"},
   {name:"Preferred strategy available",pass:!!optimization,detail:optimization?.strategy||optimization?.recommendedStrategy||"No optimization"},
   {name:"Executive owner assigned",pass:!!String(owner||"").trim(),detail:String(owner||"Unassigned")}
  ];
  const score=Math.round(checks.filter(x=>x.pass).length/checks.length*100),blockers=checks.filter(x=>!x.pass).length;
  const record={id:`V41-EDC-${Date.now()}`,owner:String(owner||"Executive owner").trim(),score,status:score===100?"decision-ready":score>=80?"controlled":"blocked",blockers,headline:release?.status==="enterprise-ready"?"V41 intelligence is ready for governed enterprise decisions.":"Complete the remaining evidence before enterprise decision use.",strategy:optimization?.strategy||optimization?.recommendedStrategy||"Pending",checks,releaseId:release?.id||null,telemetryId:telemetry?.id||null,learningId:learning?.id||null,runtimeId:runtime?.id||null,createdAt:new Date().toISOString()};
  const h=this.read(this.key,[]);h.unshift(record);localStorage.setItem(this.key,JSON.stringify(h.slice(0,30)));this.eventBus?.emit?.("v41:enterprise-decision-console",record);return record;
 }
 history(){return this.read(this.key,[]);}
}
window.BlueCurrentEnterpriseDecisionConsoleEngine=BlueCurrentEnterpriseDecisionConsoleEngine;})();
