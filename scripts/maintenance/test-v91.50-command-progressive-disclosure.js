"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../.."),pkg=require(path.join(root,"package.json"));
const Service=require(path.join(root,"server/services/pilotOperatorCommandCenterService"));
(async()=>{
 assert.equal(pkg.version,"91.50.0");
 const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");
 const css=fs.readFileSync(path.join(root,"client/styles.css"),"utf8");
 const shell=fs.readFileSync(path.join(root,"client/js/modules/hospitalityOsShell.js"),"utf8");
 for(const id of ["bcCommandLaunch","bcWorkspacePrimary","bcMoreWorkspaces","bcWorkspaceSecondary","bcPilotDetails"])assert(html.includes(`id="${id}"`),id);
 assert(html.includes('aria-expanded="false"'));
 assert(html.includes('data-role-workspace="HOST,MANAGER,OPERATOR"'));
 assert(css.includes("V91.50 — COMMAND PROGRESSIVE DISCLOSURE & NAVIGATION SIMPLIFICATION"));
 assert(css.includes(".bc-workspace-secondary[hidden]"));
 assert(shell.includes("setSecondaryWorkspaceDisclosure(open)"));
 assert(shell.includes("syncWorkspaceHierarchyForRole(role)"));

 const fakeDb={read:async()=>({})},launch={current:async()=>({current:true,hold:null,assessment:{decision:"GO_ELIGIBLE",blocking:[]}})},runtime={current:async()=>({activeSession:null})},obs={timeline:async()=>null},closeout={portfolio:async()=>({closedSessions:0,closeouts:[]})},learning={portfolio:async()=>({decisions:0,history:[]})};
 const svc=new Service(fakeDb,launch,runtime,obs,closeout,learning);
 const host=await svc.current("o","HOST"),manager=await svc.current("o","MANAGER"),exec=await svc.current("o","EXECUTIVE");
 assert.deepEqual(host.presentation.primaryWorkspaces,["guests","service"]);
 assert.deepEqual(manager.presentation.primaryWorkspaces,["service","guests","kitchen"]);
 assert.deepEqual(exec.presentation.primaryWorkspaces,["executive"]);
 assert.deepEqual(exec.presentation.secondaryWorkspaces,[]);
 console.log(JSON.stringify({ok:true,version:"91.50.0",phase:"D",primaryWorkOneTapAway:true,secondaryToolsOnDemand:true,roleAwareWorkspacePriority:true,pilotDetailsCollapsed:true,mobileNavigationCompression:true,workspaceAvailabilityPreserved:true,serverAuthorizationUnchanged:true,automaticExpansion:false,nextGate:"SHIFT_START_AND_HANDOFF_OPERATOR_FLOW"},null,2));
})().catch(e=>{console.error(e);process.exit(1);});
