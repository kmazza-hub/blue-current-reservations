(function(){"use strict";
class BlueCurrentV41PilotCertificationEngine{
 constructor(eventBus){this.eventBus=eventBus;this.key="bluecurrent:v4135:pilot-certifications";}
 read(k,f=[]){try{return JSON.parse(localStorage.getItem(k)||"null")??f;}catch{return f;}}
 latest(k){const v=this.read(k,[]);return Array.isArray(v)?v[0]||null:v||null;}
 certify(owner){
  const readiness=this.latest("bluecurrent:v4132:production-readiness"),session=this.latest("bluecurrent:v4133:decision-runtime"),rehearsal=this.latest("bluecurrent:v4134:intervention-rehearsals"),negotiation=this.latest("bluecurrent:v4131:agent-negotiations"),benchmark=this.latest("bluecurrent:v4124:reasoning-benchmarks");
  const checks=[
   {name:"Production readiness controlled",pass:!!readiness&&Number(readiness.score||0)>=80,detail:readiness?.id||"No readiness evidence"},
   {name:"Decision runtime active",pass:!!session&&/active|controlled/i.test(session.status||""),detail:session?.id||"No runtime session"},
   {name:"Intervention rehearsal passed",pass:!!rehearsal&&Number(rehearsal.score||0)>=80,detail:rehearsal?.id||"No rehearsal"},
   {name:"Agent negotiation not disputed",pass:!negotiation||negotiation.status!=="disputed",detail:negotiation?.status||"No dispute"},
   {name:"Reasoning benchmark acceptable",pass:!!benchmark&&Number(benchmark.score||0)>=70,detail:`${benchmark?.score||0}%`},
   {name:"Pilot owner assigned",pass:!!String(owner||"").trim(),detail:String(owner||"Unassigned")}
  ];
  const passed=checks.filter(x=>x.pass).length,score=Math.round(passed/checks.length*100),blockers=checks.filter(x=>!x.pass).length;
  const result={id:`V41-PILOT-${Date.now()}`,owner:String(owner||"").trim(),score,status:score===100?"pilot-certified":score>=83?"conditional":"blocked",blockers,checks,readinessId:readiness?.id||null,sessionId:session?.id||null,rehearsalId:rehearsal?.id||null,createdAt:new Date().toISOString()};
  const h=this.read(this.key,[]);h.unshift(result);localStorage.setItem(this.key,JSON.stringify(h.slice(0,20)));this.eventBus?.emit?.("v41-pilot-certification:completed",result);return result;
 }
 history(){return this.read(this.key,[]);}
}
window.BlueCurrentV41PilotCertificationEngine=BlueCurrentV41PilotCertificationEngine;})();