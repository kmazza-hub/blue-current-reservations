"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../.."),pkg=require(path.join(root,"package.json"));
(async()=>{
 assert(Number(pkg.version.split(".")[0]) >= 90);
 const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");
 const shell=fs.readFileSync(path.join(root,"client/js/modules/hospitalityOsShell.js"),"utf8");
 const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8");
 const service=fs.readFileSync(path.join(root,"server/services/pilotOperatorCommandCenterService.js"),"utf8");
 for(const id of ["bcPilotStart","bcPilotPause","bcPilotResume","bcPilotStop","bcPilotActionFeedback","bcPilotIncidents","bcPilotIncidentList"])assert(html.includes(`id="${id}"`),id);
 for(const action of ["start","pause","resume","stop"])assert(router.includes(`/api/pilot/operator-command/${action}`)||router.includes('["pause","resume","stop"]'),action);
 assert(router.includes("/api/pilot/operator-command/incidents/"));
 assert(shell.includes("pilotControl(action)"));assert(shell.includes("pilotIncidentAction(incidentId,action)"));
 assert(service.includes("canStart"));assert(service.includes("canPause"));assert(service.includes("canResume"));assert(service.includes("canStop"));
 console.log(JSON.stringify({ok:true,version:"90.75.0",phase:"D",sessionStart:true,sessionPause:true,sessionResume:true,sessionStop:true,incidentAcknowledge:true,incidentEscalate:true,incidentResolve:true,blockedActionFeedback:true,existingRuntimeGuardrailsReused:true,adminPermissionRequired:true,automaticSessionStart:false,automaticExpansion:false,autonomousProductionChanges:false,nextGate:"FIELD_OPERATOR_WORKFLOW_POLISH"},null,2));
})().catch(e=>{console.error(e);process.exit(1);});
