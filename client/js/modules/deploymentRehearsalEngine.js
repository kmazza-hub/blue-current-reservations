(function(){"use strict";
class BlueCurrentDeploymentRehearsalEngine{
 constructor({eventBus,appState}){this.eventBus=eventBus;this.appState=appState;setTimeout(()=>this.run("initial"),900);}
 async run(reason="manual"){
  const checks=[]; const add=(label,pass,detail)=>checks.push({label,pass:Boolean(pass),detail});
  const smoke=this.appState.get("productionSmokeTest")||{};
  const checkpoint=(this.appState.get("rollbackCheckpoints")||[]).at?.(-1)||null;
  const candidate=this.appState.get("releaseCandidate")||{};
  add("Focused startup active",document.documentElement.dataset.startupMode==="safe",document.documentElement.dataset.startupMode||"unknown");
  add("Boot completed",document.documentElement.dataset.bootComplete==="true",window.BlueCurrentBootGuard?.status||"unknown");
  add("Smoke test passed",Number(smoke.score||0)>=80,`${Number(smoke.score||0)}%`);
  add("Rollback checkpoint available",Boolean(checkpoint),checkpoint?.id||"none");
  add("Release candidate available",Boolean(candidate.id||candidate.candidateId),candidate.id||candidate.candidateId||"none");
  const passed=checks.filter(x=>x.pass).length,score=Math.round(passed/checks.length*100);
  const result={capturedAt:new Date().toISOString(),reason,score,status:score===100?"passed":score>=80?"watch":"failed",passed,total:checks.length,checks,nextAction:score===100?"Deployment rehearsal passed. Proceed to environment and acceptance checks.":"Resolve failed rehearsal checks before certification."};
  this.appState.update({deploymentRehearsal:result,deploymentRehearsalHistory:[...(this.appState.get("deploymentRehearsalHistory")||[]),result].slice(-30)});
  this.eventBus.emit("deployment-rehearsal:updated",structuredClone(result)); return result;
 }
 export(){const v=this.appState.get("deploymentRehearsal")||{};const blob=new Blob([JSON.stringify(v,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`blue-current-deployment-rehearsal-${Date.now()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),0);return v;}
}
window.BlueCurrentDeploymentRehearsalEngine=BlueCurrentDeploymentRehearsalEngine;})();
