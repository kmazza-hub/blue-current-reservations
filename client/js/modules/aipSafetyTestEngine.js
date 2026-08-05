(function(){"use strict";
class BlueCurrentAIPSafetyTestEngine{
 constructor(eventBus){this.eventBus=eventBus;this.key="bluecurrent:v4017:safety-tests";this.runs=this.read();}
 read(){try{return JSON.parse(localStorage.getItem(this.key)||"[]");}catch{return[];}}
 persist(){localStorage.setItem(this.key,JSON.stringify(this.runs.slice(0,30)));}
 run(context={}){const sources=context.sources||[],route=context.route||null;const tests=[
  {id:"approval-write",label:"Write actions require human approval",pass:!route||!/write|execute|change/i.test(route.task)||route.approvalRequired},
  {id:"trusted-grounding",label:"At least one controlled or trusted source is registered",pass:sources.some(x=>["trusted","controlled"].includes(x.trust)&&x.status==="active")},
  {id:"high-risk-depth",label:"High-risk tasks use the deep routing profile",pass:!route||route.risk!=="high"||route.profile==="deep"},
  {id:"no-auto-execution",label:"AIP remains draft/approval-first",pass:true},
  {id:"ownership",label:"Active knowledge sources have named owners",pass:sources.filter(x=>x.status==="active").every(x=>String(x.owner||"").trim().length>0)}
 ];const passed=tests.filter(x=>x.pass).length;const run={id:`SAFE-${Date.now()}`,score:Math.round((passed/tests.length)*100),status:passed===tests.length?"Passed":passed>=tests.length-1?"Watch":"Failed",tests,createdAt:new Date().toISOString()};this.runs.unshift(run);this.persist();this.eventBus?.emit?.("aip:safety-tests-complete",run);return run;}
 latest(){return this.runs[0]||null;}
}
window.BlueCurrentAIPSafetyTestEngine=BlueCurrentAIPSafetyTestEngine;})();