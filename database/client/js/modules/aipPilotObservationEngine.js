(function(){"use strict";
class BlueCurrentAIPPilotObservationEngine{
 constructor(eventBus){this.eventBus=eventBus;this.key="bluecurrent:v4027:pilot-observations";this.records=this.read();}
 read(){try{const v=JSON.parse(localStorage.getItem(this.key)||"[]");return Array.isArray(v)?v:[];}catch{return[];}}
 save(){localStorage.setItem(this.key,JSON.stringify(this.records.slice(-150)));}
 capture(owner="Pilot Observer",note=""){const gate=JSON.parse(localStorage.getItem("bluecurrent:v4026:pilot-launch")||"null");const tasks=JSON.parse(localStorage.getItem("bluecurrent:v4024:delegations")||"[]");const approvals=JSON.parse(localStorage.getItem("bluecurrent:v405:approval-queue")||"[]");const transcript=JSON.parse(sessionStorage.getItem("bluecurrent:v4025:transcript")||"[]");const record={id:`AIP-OBS-${Date.now()}`,owner,note,createdAt:new Date().toISOString(),gateStatus:gate?.status||"No gate",openTasks:tasks.filter(x=>x.status!=="complete").length,pendingApprovals:approvals.filter(x=>!x.decision).length,activityCount:transcript.length,status:gate?.status?.includes("Ready")?"Controlled":"Watch"};this.records.push(record);this.save();this.eventBus?.emit?.("aip:pilot-observation",record);return record;}
 summary(){return{total:this.records.length,controlled:this.records.filter(x=>x.status==="Controlled").length,watch:this.records.filter(x=>x.status==="Watch").length,last:this.records.at(-1)||null,records:[...this.records].reverse()};}
 clear(){this.records=[];this.save();}
}
window.BlueCurrentAIPPilotObservationEngine=BlueCurrentAIPPilotObservationEngine;})();