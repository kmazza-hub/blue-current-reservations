(function(){"use strict";
class BlueCurrentExecutiveReasoningBriefEngine{
 constructor(eventBus){this.eventBus=eventBus;this.key="bluecurrent:v4114:executive-reasoning-brief";}
 read(key,fallback=null){try{return JSON.parse(localStorage.getItem(key)||"null")??fallback;}catch{return fallback;}}
 build(owner="Executive sponsor"){
  const forecast=this.read("bluecurrent:v4113:decision-horizon",[])[0],reasoning=this.read("bluecurrent:v416:operational-reasoning",[])[0],verification=this.read("bluecurrent:v4111:plan-verifications",[])[0],plan=this.read("bluecurrent:v418:multi-step-plans",[])[0],memory=this.read("bluecurrent:v4112:operational-memory",[]);
  const blockers=[];if(!forecast)blockers.push("Run a decision-horizon forecast.");if(!reasoning)blockers.push("Run operational reasoning.");if(!plan)blockers.push("Build a multi-step plan.");if(!verification||verification.status!=="verified")blockers.push("Verify the plan before executive approval.");const confidence=Math.round(([forecast?.confidence,reasoning?.confidence,verification?.score].filter(Number.isFinite).reduce((a,b)=>a+b,0))/( [forecast?.confidence,reasoning?.confidence,verification?.score].filter(Number.isFinite).length||1));
  const brief={id:`EXEC-${Date.now()}`,owner,status:blockers.length?"conditional":"ready",confidence,blockers,headline:reasoning?.issue||reasoning?.primaryIssue||"Operating picture assembled",recommendation:reasoning?.recommendation||reasoning?.response||"Maintain current operating posture and monitor the selected horizon.",forecast:forecast||null,planId:plan?.id||null,verificationId:verification?.id||null,memoryPoints:memory.length,createdAt:new Date().toISOString()};const h=this.read(this.key,[]);h.unshift(brief);localStorage.setItem(this.key,JSON.stringify(h.slice(0,20)));this.eventBus?.emit?.("aip:executive-reasoning-briefed",brief);return brief;
 }
 history(){return this.read(this.key,[]);}
}
window.BlueCurrentExecutiveReasoningBriefEngine=BlueCurrentExecutiveReasoningBriefEngine;})();