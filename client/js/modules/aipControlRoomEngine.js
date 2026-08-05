(function(){"use strict";
class BlueCurrentAIPControlRoomEngine{
 constructor(eventBus){this.eventBus=eventBus;this.key="bluecurrent:v4020:control-room";this.history=this.read();}
 read(){try{return JSON.parse(localStorage.getItem(this.key)||"[]");}catch{return[];}}
 persist(){localStorage.setItem(this.key,JSON.stringify(this.history.slice(0,50)));}
 evaluate(context={}){const safety=context.safety||null,budget=context.budget||null,sources=context.sources||[],deployments=context.deployments||[],evidence=context.evidence||[];const checks=[
  {id:"safety",label:"Safety test suite passed",pass:Boolean(safety&&safety.score>=80),value:safety?.score??0},
  {id:"budget",label:"Usage budget remains controlled",pass:Boolean(!budget||budget.status!=="Blocked"),value:budget?.utilization??0},
  {id:"sources",label:"At least one trusted active knowledge source",pass:sources.some(x=>x.status==="active"&&["trusted","controlled"].includes(x.trust)),value:sources.length},
  {id:"deployment",label:"No active agent bypasses governed deployment",pass:deployments.every(x=>x.status!=="active"||Boolean(x.owner||x.deploymentOwner)),value:deployments.filter(x=>x.status==="active").length},
  {id:"evidence",label:"Agent activity is producing traceable evidence",pass:evidence.length>0,value:evidence.length}
 ];const passed=checks.filter(x=>x.pass).length;const score=Math.round(passed/checks.length*100);const report={id:`AIP-CTRL-${Date.now()}`,score,status:score===100?"Certified":score>=80?"Controlled":score>=60?"Hardening":"Blocked",blockers:checks.filter(x=>!x.pass).length,checks,createdAt:new Date().toISOString()};this.history.unshift(report);this.persist();this.eventBus?.emit?.("aip:control-room-evaluated",report);return report;}
 latest(){return this.history[0]||null;}
}
window.BlueCurrentAIPControlRoomEngine=BlueCurrentAIPControlRoomEngine;})();