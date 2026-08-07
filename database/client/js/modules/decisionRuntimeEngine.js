(function(){"use strict";
class BlueCurrentDecisionRuntimeEngine{
 constructor(eventBus){this.eventBus=eventBus;this.key="bluecurrent:v4133:decision-runtime";}
 read(k,f=[]){try{return JSON.parse(localStorage.getItem(k)||"null")??f;}catch{return f;}}
 latest(k){const v=this.read(k,[]);return Array.isArray(v)?v[0]||null:v||null;}
 start(owner){
  const readiness=this.latest("bluecurrent:v4132:production-readiness"),optimization=this.latest("bluecurrent:v4130:predictive-optimizations"),negotiation=this.latest("bluecurrent:v4131:agent-negotiations"),workspace=this.latest("bluecurrent:v4129:executive-workspaces");
  const checks=[
   {name:"Production readiness available",pass:!!readiness&&Number(readiness.score||0)>=80,detail:readiness?.id||"No readiness gate"},
   {name:"Optimized strategy selected",pass:!!optimization?.recommended,detail:optimization?.recommended?.name||"No strategy"},
   {name:"Cross-agent negotiation controlled",pass:!!negotiation&&negotiation.status!=="disputed",detail:negotiation?.status||"No negotiation"},
   {name:"Executive workspace prepared",pass:!!workspace,detail:workspace?.id||"No workspace"},
   {name:"Human session owner assigned",pass:!!String(owner||"").trim(),detail:String(owner||"Unassigned")}
  ];
  const passed=checks.filter(x=>x.pass).length,score=Math.round(passed/checks.length*100),blockers=checks.filter(x=>!x.pass).length;
  const result={id:`V41-RUN-${Date.now()}`,owner:String(owner||"Decision owner").trim(),score,status:score===100?"active":score>=80?"controlled":"blocked",blockers,strategy:optimization?.recommended||null,negotiationId:negotiation?.id||null,workspaceId:workspace?.id||null,readinessId:readiness?.id||null,checks,startedAt:new Date().toISOString()};
  const h=this.read(this.key,[]);h.unshift(result);localStorage.setItem(this.key,JSON.stringify(h.slice(0,30)));this.eventBus?.emit?.("decision-runtime:started",result);return result;
 }
 history(){return this.read(this.key,[]);}
}
window.BlueCurrentDecisionRuntimeEngine=BlueCurrentDecisionRuntimeEngine;})();