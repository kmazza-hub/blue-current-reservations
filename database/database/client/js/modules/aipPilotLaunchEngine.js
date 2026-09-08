(function(){"use strict";
class BlueCurrentAIPPilotLaunchEngine{
 constructor(eventBus){this.eventBus=eventBus;this.key="bluecurrent:v4026:pilot-launch";this.last=this.read();}
 read(){try{return JSON.parse(localStorage.getItem(this.key)||"null");}catch{return null;}}
 score(){const certification=JSON.parse(localStorage.getItem("bluecurrent:v4023:aip-certification")||"null");const safety=JSON.parse(localStorage.getItem("bluecurrent:v4017:safety-tests")||"null");const deployments=JSON.parse(localStorage.getItem("bluecurrent:v4014:deployments")||"[]");const approvals=JSON.parse(localStorage.getItem("bluecurrent:v405:approval-queue")||"[]");const tasks=JSON.parse(localStorage.getItem("bluecurrent:v4024:delegations")||"[]");const checks=[
 {label:"AIP release certification exists",pass:Boolean(certification),detail:certification?.status||"No certificate"},
 {label:"Safety suite has evidence",pass:Boolean(safety),detail:safety?.status||"No safety run"},
 {label:"At least one governed agent deployment",pass:deployments.some(x=>["pilot","active"].includes(x.stage||x.status)),detail:`${deployments.length} deployment records`},
 {label:"Approval queue has no unreviewed critical item",pass:!approvals.some(x=>x.risk==="critical"&&!x.decision),detail:`${approvals.filter(x=>!x.decision).length} pending approvals`},
 {label:"Human task delegation is available",pass:Array.isArray(tasks),detail:`${tasks.length} delegated tasks`}
 ];const passed=checks.filter(x=>x.pass).length;return{checks,score:Math.round(passed/checks.length*100),blockers:checks.length-passed};}
 run(owner="AIP Pilot Owner",windowText="Controlled pilot"){const base=this.score();const record={id:`AIP-PILOT-${Date.now()}`,owner,window:windowText,...base,status:base.blockers===0?"Ready for controlled pilot":base.score>=60?"Conditional":"Blocked",createdAt:new Date().toISOString()};this.last=record;localStorage.setItem(this.key,JSON.stringify(record));this.eventBus?.emit?.("aip:pilot-gate-run",record);return record;}
 export(){return this.last;}
}
window.BlueCurrentAIPPilotLaunchEngine=BlueCurrentAIPPilotLaunchEngine;})();