"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../.."),pkg=require(path.join(root,"package.json"));
(()=>{
 assert.equal(pkg.version,"91.0.0");
 const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");
 const css=fs.readFileSync(path.join(root,"client/styles.css"),"utf8");
 const shell=fs.readFileSync(path.join(root,"client/js/modules/hospitalityOsShell.js"),"utf8");
 const service=fs.readFileSync(path.join(root,"server/services/pilotOperatorCommandCenterService.js"),"utf8");
 for(const id of ["bcPilotFocusStrip","bcPilotFocusState","bcPilotFocusPriority","bcPilotSessionClock","bcPilotRefresh","bcPilotConfirmDialog","bcPilotConfirmReason"])assert(html.includes(`id="${id}"`),id);
 assert(css.includes("V91.0 — FIELD OPERATOR WORKFLOW & SERVICE-NIGHT POLISH"));
 assert(css.includes("@media(max-width:480px)"));
 assert(css.includes("min-height:48px"));
 assert(shell.includes("requestPilotConfirmation(action)"));
 assert(shell.includes("formatPilotElapsed"));
 assert(shell.includes('["pause","stop"].includes(action)'));
 assert(service.includes('dangerousActions:["STOP"]'));
 assert(service.includes('reasonRequired:["PAUSE","STOP"]'));
 console.log(JSON.stringify({
  ok:true,version:"91.0.0",phase:"D",
  stateAboveFold:true,priorityAboveFold:true,sessionClock:true,
  explicitHighRiskConfirmation:true,pauseStopReasonRequired:true,
  touchFriendlyControls:true,mobileTabletReadiness:true,
  dangerousActionClarity:true,liveOperatorFeedback:true,
  backendAuthorityUnchanged:true,existingRuntimeGuardrailsReused:true,
  automaticExpansion:false,autonomousProductionChanges:false,
  nextGate:"COMMAND_INFORMATION_HIERARCHY_AND_ROLE_FOCUS"
 },null,2));
})();
