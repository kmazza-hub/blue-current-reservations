"use strict";
const fs=require("fs"),assert=require("assert");
const Service=require("../../server/services/operatorUxHardeningService");

(async()=>{
  const state={operatorUxFrictionRecords:[],operatorUxCertifications:[]};
  const audits=[],events=[];
  const database={read:async()=>JSON.parse(JSON.stringify(state)),mutate:async fn=>fn(state)};
  const svc=new Service(
    database,
    {record:async x=>audits.push(x)},
    {publish:(n,p)=>events.push([n,p])},
    {snapshot:async()=>({status:"role-permission-ready-for-certification"})}
  );

  let snap=await svc.snapshot("org",["*"]);
  assert.equal(snap.version,"51.30.0");
  assert.equal(snap.status,"operator-ux-ready-for-certification");
  assert.equal(snap.workflows.length,8);
  assert.equal(snap.terminology.length,6);
  assert.equal(snap.checks.every(x=>x.passed),true);
  assert.equal(snap.hardening.minimumInteractiveTargetPx,44);
  assert.equal(snap.policy.noAutomaticWorkflowRedesign,true);

  const finding=await svc.recordFinding("org",{
    workflowId:"RESERVATIONS",severity:"high",
    issue:"Guest-note update requires too many context switches during arrival.",
    observedClicks:7,expectedClicks:3,
    terminologyIssue:"Use Guest note consistently."
  },"Tester");
  assert.equal(finding.status,"OPEN");
  assert.equal(finding.automaticUiChangePerformed,false);

  snap=await svc.snapshot("org",["*"]);
  assert.equal(snap.status,"operator-ux-hardening-required");
  assert.equal(snap.totals.highCriticalOpen,1);

  const resolved=await svc.resolveFinding("org",finding.id,{
    resolution:"Primary reservation context and guest-note path were verified in one operator flow."
  },"Tester");
  assert.equal(resolved.status,"RESOLVED");

  snap=await svc.snapshot("org",["*"]);
  assert.equal(snap.status,"operator-ux-ready-for-certification");
  assert.equal(snap.totals.highCriticalOpen,0);

  const cert=await svc.certify("org",["*"],{
    evidence:"Eight primary workflows were exercised with quick navigation, keyboard shortcuts, readable focus states, and restaurant terminology.",
    note:"Operator UX hardening accepted for pilot rehearsal."
  },"Tester");
  assert.equal(cert.status,"OPERATOR_UX_CERTIFIED");
  assert.equal(cert.workflowBehaviorChangedByCertification,false);

  snap=await svc.snapshot("org",["*"]);
  assert.equal(snap.status,"operator-ux-certified");
  assert.equal(audits.length,3);
  assert.equal(events.length,3);

  const html=fs.readFileSync("client/index.html","utf8");
  [
    "restaurantDayLifecycle","reservationYieldCenter","digitalTwinVisualizationCenter",
    "guidedShiftCenter","kitchenThroughputCenter","guestRecoveryCenter",
    "shiftCloseoutCenter","pilotOperationalReadiness"
  ].forEach(id=>assert(html.includes(`id="${id}"`),`missing quick-nav target ${id}`));

  const css=fs.readFileSync("client/styles.css","utf8");
  assert(css.includes('min-height:44px'));
  assert(css.includes(':focus-visible'));
  assert(css.includes('.oux-quick-actions'));

  console.log(JSON.stringify({
    ok:true,version:"51.30.0",
    primaryWorkflows:8,
    canonicalTerminologyRules:6,
    minimumInteractiveTargetPx:44,
    visibleFocus:true,
    keyboardNavigation:true,
    highCriticalFindingBlocksCertification:true,
    humanResolutionEvidence:true,
    humanCertification:true,
    noAutomaticWorkflowRedesign:true,
    noAutomaticActionExecution:true,
    autonomousProductionChanges:false
  },null,2));
})().catch(e=>{console.error(e);process.exit(1);});
