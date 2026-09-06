"use strict";
const fs=require("fs"),os=require("os"),path=require("path"),{spawnSync}=require("child_process");
const root=path.resolve(__dirname,"../.."),Acceptance=require(path.join(root,"server/services/pilotOperatorAcceptanceService"));
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"bc-v344-")),state={pilotOperatorObservations:[],pilotOperatorAcceptances:{}};
const db={read:async()=>structuredClone(state),mutate:async fn=>fn(state)};
let simulationId="simulation-1";
const simulation={status:async()=>({current:true,latest:{id:simulationId}})};
const binding={current:async()=>({ready:true,binding:{id:"binding-1",locationId:"loc-chefs-pilot"}})};
const service=new Acceptance(db,simulation,binding);let passed=0,total=0;
function check(name,condition){total+=1;if(condition){passed+=1;console.log(`PASS ${total}: ${name}`);}else{console.error(`FAIL ${total}: ${name}`);process.exitCode=1;}}
async function rejected(input,text){try{await service.observe("org-chefs",input,"admin");return false;}catch(error){return error.message.includes(text);}}
(async()=>{
  const base={dimension:"clarity",workflowStep:"launch",score:4,note:"Physical operator evidence from the intended pilot device.",outcome:"CLEAR",capturedAt:new Date().toISOString(),locationId:"loc-chefs-pilot",deviceId:"ipad-1",deviceModel:"iPad",osVersion:"iPadOS",network:"pilot-wifi",operatorName:"Pilot Operator"};
  check("Simulation-only evidence is rejected",await rejected({...base,evidenceType:"SIMULATION",environment:"LAN"},"PHYSICAL_IPAD"));
  check("Unknown device identity is rejected",await rejected({...base,evidenceType:"PHYSICAL_IPAD",environment:"LAN",deviceId:""},"deviceId"));
  check("Wrong restaurant location is rejected",await rejected({...base,evidenceType:"PHYSICAL_IPAD",environment:"LAN",locationId:"wrong"},"does not match"));
  check("Unknown workflow steps are rejected",await rejected({...base,evidenceType:"PHYSICAL_IPAD",environment:"LAN",workflowStep:"dashboard"},"workflow step"));
  const dimensions=service.dimensions(),steps=service.workflowSteps();
  for(const [index,step] of steps.entries())await service.observe("org-chefs",{...base,evidenceType:"PHYSICAL_IPAD",environment:"LAN",workflowStep:step,dimension:dimensions[index%dimensions.length].id},"admin");
  let assessment=await service.assess("org-chefs");
  check("Complete LAN walkthrough is recorded but not final acceptance",assessment.missingWorkflowSteps.length===0&&assessment.ready===false);
  check("Hosted workflow evidence remains explicit",assessment.missingHostedWorkflowSteps.length===steps.length);
  for(const [index,step] of steps.entries())await service.observe("org-chefs",{...base,evidenceType:"PHYSICAL_IPAD",environment:"HOSTED_PILOT",workflowStep:step,dimension:dimensions[index%dimensions.length].id},"admin");
  assessment=await service.assess("org-chefs");
  check("Every dimension has physical evidence",assessment.missingDimensions.length===0);
  check("Every frontline step has hosted iPad evidence",assessment.missingHostedWorkflowSteps.length===0);
  check("Complete clear hosted walkthrough becomes acceptance-ready",assessment.ready===true&&assessment.blockerCount===0&&assessment.physicalDeviceCount===1);
  try{await service.accept("org-chefs",{statement:"Operator approves the hosted workflow for pilot."},"admin");check("Acceptance requires explicit physical confirmations",false);}catch(error){check("Acceptance requires explicit physical confirmations",error.message.includes("confirmation"));}
  const accepted=await service.accept("org-chefs",{statement:"Named operator approves the complete hosted physical iPad workflow for pilot use.",physicalDeviceConfirmed:true,hostedEnvironmentConfirmed:true},"admin");
  check("Human acceptance records physical and hosted confirmation",accepted.status==="ACCEPTED"&&accepted.physicalDeviceConfirmed&&accepted.hostedEnvironmentConfirmed);
  simulationId="simulation-2";
  const stale=await service.current("org-chefs");
  check("A new simulation invalidates earlier acceptance evidence",stale.current===false&&stale.status==="REACCEPTANCE_REQUIRED");
  const pkg=require(path.join(root,"package.json"));
  check("Runtime retains or advances beyond V100.3.44",Number(pkg.version.split(".").at(-1))>=44);
  const certifier=path.join(root,"scripts/maintenance/certify-v100.3.44-physical-operator-acceptance-gate.js");
  const listing=spawnSync(process.execPath,[certifier,"--list"],{cwd:root,encoding:"utf8"});const manifest=listing.status===0?JSON.parse(listing.stdout):null;
  check("Historical V100.3.44 certification includes V100.3.43 and V100.3.44",manifest?.release==="100.3.44"&&manifest.gates.includes("test-v100.3.43-pilot-release-candidate-lock.js")&&manifest.gates.includes("test-v100.3.44-physical-operator-acceptance-gate.js"));
  check("No release database payload exists",!fs.existsSync(path.join(root,"database/data/V100.3.44.json")));
  console.log(`V100.3.44 physical operator acceptance gate ${passed}/${total}`);if(passed!==total)process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>fs.rmSync(temp,{recursive:true,force:true}));
