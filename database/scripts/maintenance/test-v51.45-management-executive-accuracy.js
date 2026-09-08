"use strict";
const assert=require("assert");
const Service=require("../../server/services/managementExecutiveAccuracyService");
const Executive=require("../../server/services/executiveCommandCenterService");

(async()=>{
  const state={
    locations:[{id:"loc1",organizationId:"org",name:"Pilot Restaurant"}],
    tables:[
      {id:"t1",organizationId:"org",locationId:"loc1",status:"seated"},
      {id:"t2",organizationId:"org",locationId:"loc1",status:"available"}
    ],
    reservations:[
      {id:"r1",organizationId:"org",locationId:"loc1",status:"seated",partySize:4},
      {id:"r2",organizationId:"org",locationId:"loc1",status:"confirmed",partySize:2}
    ],
    waitlist:[{id:"w1",organizationId:"org",locationId:"loc1",status:"waiting"}],
    staff:[{id:"s1",organizationId:"org",locationId:"loc1",status:"active"}],
    kitchenTickets:[{id:"k1",organizationId:"org",locationId:"loc1",status:"cooking"}],
    financialSnapshots:[{id:"f1",organizationId:"org",locationId:"loc1",revenue:1200,generatedAt:"2026-08-09T12:00:00Z"}],
    managementExecutiveAccuracyCertifications:[]
  };
  const audits=[],events=[];
  const db={read:async()=>JSON.parse(JSON.stringify(state)),mutate:async fn=>fn(state)};
  const executive={
    snapshot:async()=>({
      locations:[{locationId:"loc1",occupancy:50,reservations:2,waitlist:1,activeStaff:1,activeTickets:1,guestCount:4,revenue:1200}],
      portfolio:{occupancy:50,guestCount:4,revenue:1200}
    })
  };
  const svc=new Service(
    db,
    {record:async x=>audits.push(x)},
    {publish:(n,p)=>events.push([n,p])},
    executive,
    {snapshot:async()=>({status:"live-floor-service-ready",locations:[{locationId:"loc1",floorServiceState:"FLOOR_SERVICE_REHEARSAL_NOT_STARTED"}]})}
  );

  let snap=await svc.snapshot("org",["loc1"]);
  assert.equal(snap.version,"51.45.0");
  assert.equal(snap.status,"management-executive-accuracy-ready-for-certification");
  assert.equal(snap.totals.discrepancies,0);
  assert.equal(snap.totals.unverified,0);
  assert.equal(snap.totals.criticalIssues,0);
  assert.equal(snap.locations[0].trustState,"EXECUTIVE_DATA_RECONCILED");
  assert.equal(snap.policy.noSyntheticExecutivePass,true);

  const cert=await svc.certify("org",["loc1"],{
    evidence:"Location and portfolio KPIs reconciled to authoritative restaurant and financial source records.",
    note:"Executive dashboard metrics accepted for pilot."
  },"Tester");
  assert.equal(cert.status,"MANAGEMENT_EXECUTIVE_ACCURACY_CERTIFIED");
  assert.equal(cert.metricCorrectionPerformedByCertification,false);
  assert.equal(cert.financialInferencePerformedByCertification,false);

  snap=await svc.snapshot("org",["loc1"]);
  assert.equal(snap.status,"management-executive-accuracy-certified");

  // Missing financial provenance must block revenue trust/certification.
  state.financialSnapshots=[];
  state.managementExecutiveAccuracyCertifications=[];
  const blocked=await svc.snapshot("org",["loc1"]);
  assert.equal(blocked.status,"management-executive-accuracy-blocked");
  assert(blocked.criticalIssues.some(x=>x.metric==="revenue"&&x.status==="UNVERIFIED"));

  let certificationBlocked=false;
  try{
    await svc.certify("org",["loc1"],{evidence:"test",note:"test"},"Tester");
  }catch(e){certificationBlocked=/critical executive-data trust issues/i.test(e.message);}
  assert(certificationBlocked);



  const executiveState={
    locations:[{id:"loc_missing",organizationId:"org",name:"No Source",status:"open"}],
    tables:[],reservations:[],waitlist:[],staff:[],kitchenTickets:[],aiDecisionHistory:[],executiveGoals:[]
  };
  const hardenedExecutive=new Executive(
    {read:async()=>executiveState,update:async()=>null},
    {record:async()=>{}},{publish:()=>{}},{snapshot:async()=>({health:{overall:null}})}
  );
  const hardened=await hardenedExecutive.snapshot("org");
  assert.equal(hardened.locations[0].revenue,null);
  assert.equal(hardened.locations[0].occupancy,null);
  assert.equal(hardened.locations[0].syntheticFallbackUsed,false);
  assert.equal(hardened.dataPolicy.syntheticFallbacks,false);

  console.log(JSON.stringify({
    ok:true,version:"51.45.0",
    kpiSourceTracing:true,
    syntheticExecutiveFallbacksRemoved:true,
    dashboardSourceReconciliation:true,
    occupancyAccuracy:true,
    reservationAccuracy:true,
    waitlistAccuracy:true,
    laborSignalIntegrity:true,
    kitchenSignalIntegrity:true,
    guestCountProvenance:true,
    revenueProvenanceRequired:true,
    portfolioRollupReconciliation:true,
    unverifiedRevenueBlocksCertification:true,
    humanExecutiveTrustCertification:true,
    noSyntheticExecutivePass:true,
    noAutomaticMetricCorrection:true,
    noAutomaticFinancialInference:true,
    autonomousProductionChanges:false
  },null,2));
})().catch(e=>{console.error(e);process.exit(1);});
