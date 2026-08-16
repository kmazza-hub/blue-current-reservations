"use strict";
const assert=require("assert"),fs=require("fs"),os=require("os"),path=require("path");
const root=path.resolve(__dirname,"../.."),pkg=require(path.join(root,"package.json"));
const {createPersistence}=require(path.join(root,"server/persistence/persistenceFactory"));
const Operator=require(path.join(root,"server/services/operatorWorkflowCertificationService"));
(async()=>{
 assert.equal(pkg.version,"74.50.0");
 const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");
 const css=fs.readFileSync(path.join(root,"client/styles.css"),"utf8");
 const js=fs.readFileSync(path.join(root,"client/js/modules/operatorRoleFocus.js"),"utf8");
 const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8");
 assert(html.includes('id="operatorRoleFocus"'));
 assert(html.includes("data-focus-now")&&html.includes("data-focus-next")&&html.includes("data-focus-later"));
 ["host","server","kitchen","manager","executive"].forEach(role=>assert(html.includes(`value="${role}"`)));
 assert(css.includes("min-height:48px")&&css.includes("@media(max-width:760px)"));
 assert(js.includes("noAutomaticOperationalDecision")===false); // client makes no mutations
 assert(router.includes("/api/system/operator-workflow-certification"));

 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"bc-v7450-")),dbPath=path.join(dir,"db.json");
 fs.writeFileSync(dbPath,JSON.stringify({
  organizations:[{id:"o"}],locations:[{id:"l",organizationId:"o",name:"Pilot"}],
  reservations:[],tables:[{id:"t",organizationId:"o",locationId:"l",status:"available"}],
  staff:[],employees:[],kitchenTickets:[]
 },null,2));
 const db=createPersistence({driver:"json",databasePath:dbPath,options:{logger:{warn(){},error(){}}}});
 const good={
  workflowCertificationService:{certify:async()=>({pilotWorkflowReady:true,issues:[]})},
  failureCertificationService:{certify:async()=>({liveShiftFailureReady:true,issues:[]})}
 };
 const result=await new Operator(db,good).certify("o",["l"]);
 assert.equal(result.operatorPilotReady,true);
 assert.equal(result.roles.length,5);
 assert.equal(result.locations[0].score,100);
 assert.equal(result.experiencePolicy.darkEnvironmentHighContrastRequired,true);
 assert.equal(result.experiencePolicy.noAutomaticOperationalDecision,true);

 const bad={
  workflowCertificationService:{certify:async()=>({pilotWorkflowReady:false,issues:[{}]})},
  failureCertificationService:{certify:async()=>({liveShiftFailureReady:false,issues:[{}]})}
 };
 const blocked=await new Operator(db,bad).certify("o",["l"]);
 assert.equal(blocked.operatorPilotReady,false);
 assert(blocked.blockerCount>=2);

 console.log(JSON.stringify({ok:true,version:"74.50.0",roles:5,roleFirstFocus:true,nowNextLater:true,highContrast:true,mobileTouchTargets:true,operatorCertification:true,noAutomaticOperationalDecision:true},null,2));
})().catch(e=>{console.error(e);process.exit(1)});
