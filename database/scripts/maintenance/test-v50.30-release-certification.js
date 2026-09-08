"use strict";
const fs=require("fs"),assert=require("assert");
const Service=require("../../server/services/v50ReleaseCertificationService");

(async()=>{
  const handoff={status:"production-handoff-complete",locations:[{locationId:"a"}],policy:{stableDeclarationRequired:true,adminAcceptanceRequired:true,supportOwnershipRequired:true,acceptanceDoesNotModifyRuntime:true,automaticAcceptance:false,automaticRemediation:false,autonomousProductionChanges:false}};
  const support={status:"production-support-healthy",locations:[{locationId:"a"}],policy:{supportActionsHumanInitiated:true,escalationHumanInitiated:true,incidentLinkageReadOnly:true,automaticAcknowledgement:false,automaticEscalation:false,automaticRemediation:false,autonomousProductionChanges:false}};
  const incident={status:"incident-command-clear",activeCommands:[],commandHistory:[{id:"i1",status:"resolved"}],policy:{incidentCreationHumanInitiated:true,containmentHumanDirected:true,communicationHumanDirected:true,recoveryEvidenceHumanRecorded:true,resolutionHumanDeclared:true,automaticContainment:false,automaticRemediation:false,automaticResolution:false,autonomousProductionChanges:false}};
  const recovery={status:"post-incident-review-complete",incidents:[{incidentId:"i1"}],policy:{recoveryVerificationReadOnly:true,rootCauseHumanAuthored:true,correctiveActionsHumanOwned:true,lessonsAcceptanceHumanRequired:true,automaticCorrectiveActionExecution:false,automaticClosure:false,autonomousProductionChanges:false}};
  const governance={status:"corrective-governance-complete",actions:[{status:"COMPLETED_ACCEPTED"}],policy:{actionExecutionHumanOwned:true,verificationEvidenceHumanRecorded:true,completionAcceptanceHumanRequired:true,repeatIncidentLinkageAdvisory:true,automaticCorrectiveActionExecution:false,automaticCompletion:false,autonomousProductionChanges:false}};

  const svc=new Service({}, {snapshot:async()=>handoff},{snapshot:async()=>support},{snapshot:async()=>incident},{snapshot:async()=>recovery},{snapshot:async()=>governance});
  const snap=await svc.snapshot("org",["*"]);

  assert.equal(snap.version,"50.30.0");
  assert.equal(snap.status,"V50-CERTIFIED-LIVE");
  assert.equal(snap.architecturePassed,5);
  assert.equal(snap.architectureTotal,5);
  assert.equal(snap.liveStatePassed,5);
  assert.equal(snap.liveStateTotal,5);
  Object.entries({
    readOnlyCertification:true,
    automaticAcceptance:false,
    automaticAcknowledgement:false,
    automaticEscalation:false,
    automaticContainment:false,
    automaticRemediation:false,
    automaticResolution:false,
    automaticCorrectiveActionExecution:false,
    automaticCompletion:false,
    autonomousProductionChanges:false,
    humanProductionControl:true
  }).forEach(([k,v])=>assert.equal(snap.policy[k],v,k));

  const router=fs.readFileSync("server/api/router.js","utf8");
  [
    "/api/production-operations-handoff",
    "/api/production-health-support",
    "/api/production-incident-command",
    "/api/production-recovery-review",
    "/api/production-corrective-action-governance",
    "/api/v50-release-certification"
  ].forEach(x=>assert(router.includes(x),`missing route ${x}`));

  const html=fs.readFileSync("client/index.html","utf8");
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
  assert.equal(new Set(ids).size,ids.length,"duplicate HTML ids");
  [
    "productionOperationsHandoff","productionHealthSupport","productionIncidentCommand",
    "productionRecoveryReview","productionCorrectiveActionGovernance","v50ReleaseCertification"
  ].forEach(x=>assert(html.includes(`id="${x}"`),`missing center ${x}`));

  const app=fs.readFileSync("client/js/app-v15.1.3.js","utf8");
  [
    "productionOperationsHandoffModule","productionHealthSupportModule","productionIncidentCommandModule",
    "productionRecoveryReviewModule","productionCorrectiveActionGovernanceModule","v50ReleaseCertificationModule"
  ].forEach(x=>assert(app.includes(`const ${x} =`),`missing startup module ${x}`));

  console.log(JSON.stringify({
    ok:true,version:"50.30.0",status:snap.status,
    architectureContracts:"5/5",liveStateContracts:"5/5",
    routesCertified:6,duplicateHtmlIds:0,humanProductionControl:true,
    automaticAcceptance:false,automaticAcknowledgement:false,automaticEscalation:false,
    automaticContainment:false,automaticRemediation:false,automaticResolution:false,
    automaticCorrectiveActionExecution:false,automaticCompletion:false,autonomousProductionChanges:false
  },null,2));
})().catch(e=>{console.error(e);process.exit(1);});
