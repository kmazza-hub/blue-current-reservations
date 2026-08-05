(function(){"use strict";
class BlueCurrentAIPLearningReleaseGateEngine{
 constructor(eventBus){this.eventBus=eventBus;this.key="bluecurrent:v4032:learning-release-gate";this.last=this.read();}
 read(){try{return JSON.parse(localStorage.getItem(this.key)||"null");}catch{return null;}}
 run(owner="AIP Release Owner"){
  const backlog=JSON.parse(localStorage.getItem("bluecurrent:v4030:improvement-backlog")||"[]");const experiments=JSON.parse(localStorage.getItem("bluecurrent:v4031:prompt-experiments")||"[]");const loop=JSON.parse(localStorage.getItem("bluecurrent:v4029:learning-loop")||"null");const safety=JSON.parse(localStorage.getItem("bluecurrent:v4017:safety-tests")||"null");
  const openHigh=backlog.filter(x=>x.priority==="high"&&x.status!=="complete").length;const latestExperiment=experiments[0];const checks=[
   {name:"Learning evidence",pass:Boolean(loop&&loop.feedbackCount+loop.observationCount+loop.evaluationCount>0),detail:loop?`${loop.feedbackCount+loop.observationCount+loop.evaluationCount} evidence item(s) available`:"Run the learning loop first"},
   {name:"Owned improvement backlog",pass:backlog.length>0&&backlog.every(x=>Boolean(x.owner)),detail:`${backlog.length} backlog item(s)`},
   {name:"Critical improvements closed",pass:openHigh===0,detail:openHigh?`${openHigh} high-priority item(s) remain open`:"No open high-priority blockers"},
   {name:"Prompt experiment evidence",pass:Boolean(latestExperiment),detail:latestExperiment?`${latestExperiment.winner} selected in ${latestExperiment.name}`:"Run an isolated prompt experiment"},
   {name:"Safety evidence",pass:Boolean(safety&&(safety.score>=80||String(safety.status).toLowerCase().includes("pass"))),detail:safety?`Safety score ${safety.score??"—"}%`:"Run the safety test suite"}
  ];const passed=checks.filter(x=>x.pass).length,score=Math.round(passed/checks.length*100),blockers=checks.length-passed;const result={id:`AIP-LRN-GATE-${Date.now()}`,owner,score,blockers,status:blockers===0?"Approved for governed promotion":score>=60?"Conditional — remediation required":"Blocked",checks,createdAt:new Date().toISOString(),note:"This gate does not deploy prompts, models, policies, or agents automatically."};this.last=result;localStorage.setItem(this.key,JSON.stringify(result));this.eventBus?.emit?.("aip:learning-release-gate-run",result);return result;}
}
window.BlueCurrentAIPLearningReleaseGateEngine=BlueCurrentAIPLearningReleaseGateEngine;})();
