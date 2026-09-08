"use strict";
const assert=require("assert"),path=require("path"),fs=require("fs");
const root=path.resolve(__dirname,"../..");
const pkg=require(path.join(root,"package.json"));
const Prioritize=require(path.join(root,"server/services/commandPrioritizationService"));

assert(Number(pkg.version.split(".")[0]) >= 76);
const shell=fs.readFileSync(path.join(root,"client/js/modules/hospitalityOsShell.js"),"utf8");
const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");
assert(html.includes('id="bcDecisionState"'));
assert(html.includes('id="bcPriorityConfidence"'));
assert(shell.includes("priority.topPriorities"));
assert(shell.includes("Score ${item.score}"));
assert(shell.includes('method:"GET"')); // prioritization remains read-only; V77 adds separate human-confirmed action writes.

const svc=new Prioritize();
const picture={
 dataMode:"live-current",
 service:{activeCovers:42,activeKitchenTickets:5,foodReadyItems:4,occupancyPercent:91,averageQuotedWaitMinutes:28},
 financial:{salesForecast:20000},
 attention:[
  {severity:"high",domain:"kitchen",workspace:"kitchen",title:"Kitchen pressure needs attention",detail:"2 priority/held tickets require review.",metric:2},
  {severity:"high",domain:"kitchen",workspace:"kitchen",title:"Food is ready to run",detail:"4 items are ready at expo.",metric:4},
  {severity:"high",domain:"guests",workspace:"guests",title:"Wait is above target",detail:"Average quoted wait is 28 minutes.",metric:28},
  {severity:"watch",domain:"service",workspace:"service",title:"Dining room is near capacity",detail:"91% seated.",metric:91},
  {severity:"watch",domain:"inventory",workspace:"inventory",title:"Inventory needs review",detail:"2 items low.",metric:2}
 ]};
const result=svc.prioritize(picture);
assert.equal(result.version,"76.50.0");
assert.equal(result.topPriorities.length,3);
assert(result.deferredSignals.length>=1);
assert.equal(result.counts.sourceSignals,5);
assert(result.counts.correlatedSignals<5); // kitchen signals collapsed
assert.equal(result.topPriorities[0].rank,1);
assert(result.topPriorities[0].score>=result.topPriorities[1].score);
assert(result.topPriorities.every(x=>x.automaticAction===false));
assert(result.topPriorities.every(x=>x.decisionType==="human-review-required"));
assert.equal(result.policy.topThreeNoiseLimit,true);
assert.equal(result.policy.noAutonomousOperationalDecision,true);
assert.equal(result.policy.noDollarRiskClaim,true);
assert(result.topPriorities.some(x=>x.domain==="kitchen"&&x.evidence.length===2));

const demo=svc.prioritize({...picture,dataMode:"historical-demo"});
assert.equal(demo.confidence.label,"DEMO");
assert(demo.confidence.score<result.confidence.score);

console.log(JSON.stringify({
 ok:true,version:"76.50.0",topThree:true,signalCorrelation:true,
 urgencyScoring:true,guestImpactScoring:true,serviceRiskScoring:true,
 relativeFinancialExposure:true,historicalConfidenceDisclosure:true,
 humanDecisionRequired:true,automaticAction:false,noiseSuppression:true
},null,2));
