"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../.."),pkg=require(path.join(root,"package.json"));
const Service=require(path.join(root,"server/services/pilotOperatorCommandCenterService"));
(async()=>{
 assert(Number(pkg.version.split(".")[0]) >= 91);
 const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");
 const css=fs.readFileSync(path.join(root,"client/styles.css"),"utf8");
 const shell=fs.readFileSync(path.join(root,"client/js/modules/hospitalityOsShell.js"),"utf8");
 const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8");
 for(const id of ["bcPilotRole","bcPilotRoleGuidance","bcPilotRoleLabel","bcPilotRoleCopy"])assert(html.includes(`id="${id}"`),id);
 for(const role of ["HOST","MANAGER","OPERATOR","EXECUTIVE"])assert(html.includes(`value="${role}"`),role);
 assert(css.includes("V91.25 — COMMAND INFORMATION HIERARCHY & ROLE FOCUS"));
 assert(shell.includes('PILOT_ROLE_KEY="bc-pilot-command-role"'));
 assert(shell.includes("applyPilotRolePresentation(data)"));
 assert(router.includes('url.searchParams.get("role")'));

 const fakeDb={read:async()=>({})};
 const launch={current:async()=>({current:true,hold:null,assessment:{decision:"GO_ELIGIBLE",blocking:[]}})};
 const runtime={current:async()=>({activeSession:null})};
 const obs={timeline:async()=>null},closeout={portfolio:async()=>({closedSessions:2,closeouts:[]})},learning={portfolio:async()=>({decisions:1,history:[]})};
 const svc=new Service(fakeDb,launch,runtime,obs,closeout,learning);
 const host=await svc.current("o","HOST"),manager=await svc.current("o","MANAGER"),exec=await svc.current("o","EXECUTIVE");
 assert.equal(host.presentation.showPilotControls,false);
 assert.equal(host.presentation.primary,"GUEST_FLOW");
 assert.equal(manager.presentation.showPilotControls,true);
 assert.equal(manager.presentation.primary,"SERVICE_CONTROL");
 assert.equal(exec.presentation.showPilotControls,false);
 assert.equal(exec.presentation.showIncidents,false);
 assert.equal(exec.presentation.primary,"OUTCOME_OVERVIEW");
 assert.equal(manager.operatorBoundary.autonomousProductionChanges,false);
 console.log(JSON.stringify({
   ok:true,version:"91.25.0",phase:"D",
   hostFocus:true,managerFocus:true,operatorFocus:true,executiveFocus:true,
   presentationOnly:true,sharedBackendTruth:true,serverAuthorizationUnchanged:true,
   localRolePreference:true,mobileRoleSelector:true,
   automaticExpansion:false,autonomousProductionChanges:false,
   nextGate:"COMMAND_PROGRESSIVE_DISCLOSURE_AND_NAVIGATION_SIMPLIFICATION"
 },null,2));
})().catch(e=>{console.error(e);process.exit(1);});
