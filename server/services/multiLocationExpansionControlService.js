"use strict";

class MultiLocationExpansionControlService {
  constructor(database,auditService,realtimeHub,expansionReplicationService){
    Object.assign(this,{database,auditService,realtimeHub,expansionReplicationService});
  }
  now(){return new Date().toISOString();}
  async plans(org){
    const db=await this.database.read();
    return (db.multiLocationExpansionPlans||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  }
  async approvals(org){
    const db=await this.database.read();
    return (db.multiLocationExpansionApprovals||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.approvedAt)-new Date(a.approvedAt));
  }
  async snapshot(org,allowed){
    const [replication,plans,approvals]=await Promise.all([
      this.expansionReplicationService.snapshot(org,allowed),
      this.plans(org),this.approvals(org)
    ]);

    const approvedTargets=(replication.targets||[]).filter(x=>x.approval?.status==="EXPANSION_REPLICATION_APPROVED");
    const activePlan=plans.find(x=>x.status==="ACTIVE")||plans[0]||null;
    const approval=activePlan?approvals.find(x=>x.planId===activePlan.id)||null:null;

    const cohorts=(activePlan?.cohorts||[]).map((cohort,index)=>{
      const locations=(cohort.locationIds||[]).map(id=>approvedTargets.find(x=>x.targetLocationId===id)).filter(Boolean);
      const openBlockers=(cohort.blockers||[]).filter(x=>x.status!=="RESOLVED");
      const supportLoad=String(cohort.supportLoad||"UNKNOWN").toUpperCase();
      const checks=[
        {id:"REPLICATION_APPROVED",passed:locations.length===(cohort.locationIds||[]).length&&locations.length>0,actual:`${locations.length}/${(cohort.locationIds||[]).length} target(s) approved`},
        {id:"SEQUENCE_DEFINED",passed:Number.isInteger(cohort.sequence)&&cohort.sequence>0,actual:`sequence ${cohort.sequence||"unset"}`},
        {id:"ACTIVATION_WINDOW",passed:!!cohort.window?.start&&!!cohort.window?.end,actual:cohort.window?.start?`${cohort.window.start} → ${cohort.window.end}`:"not set"},
        {id:"SUPPORT_CAPACITY",passed:["LOW","MANAGEABLE"].includes(supportLoad),actual:supportLoad},
        {id:"DEPENDENCY_CHECK",passed:!!cohort.dependencyEvidence,actual:cohort.dependencyEvidence?"recorded":"not recorded"},
        {id:"NO_OPEN_BLOCKERS",passed:openBlockers.length===0,actual:`${openBlockers.length} open blocker(s)`},
        {id:"HUMAN_COHORT_APPROVAL",passed:cohort.status==="APPROVED",actual:cohort.status||"PLANNED"}
      ];
      return {...cohort,index:index+1,locations:locations.map(x=>({locationId:x.targetLocationId,locationName:x.targetLocationName})),checks,passed:checks.filter(x=>x.passed).length,total:checks.length,ready:checks.every(x=>x.passed),openBlockers};
    });

    const planChecks=[
      {id:"APPROVED_TARGETS_AVAILABLE",passed:approvedTargets.length>0,actual:`${approvedTargets.length} approved target(s)`},
      {id:"EXPANSION_PLAN_DEFINED",passed:!!activePlan,actual:activePlan?.name||"not defined"},
      {id:"COHORTS_DEFINED",passed:cohorts.length>0,actual:`${cohorts.length} cohort(s)`},
      {id:"MAX_CONCURRENT_LIMIT",passed:Number(activePlan?.maxConcurrentLocations)>0,actual:activePlan?String(activePlan.maxConcurrentLocations):"not set"},
      {id:"SUPPORT_OWNER",passed:!!activePlan?.supportOwner,actual:activePlan?.supportOwner||"not assigned"},
      {id:"PAUSE_AUTHORITY",passed:!!activePlan?.pauseAuthority,actual:activePlan?.pauseAuthority||"not assigned"},
      {id:"PLAN_APPROVAL",passed:approval?.status==="MULTI_LOCATION_EXPANSION_APPROVED",actual:approval?.status||"not approved"}
    ];

    return {
      version:"52.20.0",generatedAt:this.now(),
      status:approval?.status==="MULTI_LOCATION_EXPANSION_APPROVED"?"multi-location-expansion-approved":activePlan?"multi-location-expansion-in-review":"multi-location-expansion-plan-required",
      headline:`${approvedTargets.length} replication-approved target(s); ${cohorts.filter(x=>x.ready).length}/${cohorts.length} cohort(s) ready; ${approval?1:0} plan approval(s).`,
      approvedTargets:approvedTargets.map(x=>({locationId:x.targetLocationId,locationName:x.targetLocationName})),
      plan:activePlan,approval,cohorts,planChecks,
      policy:{
        replicationApprovalRequired:true,
        rolloutCohortsRequired:true,
        maxConcurrentLimitRequired:true,
        supportCapacityRequired:true,
        dependencyEvidenceRequired:true,
        zeroOpenBlockersRequired:true,
        humanPlanApprovalRequired:true,
        pauseAuthorityRequired:true,
        approvalDoesNotDeploy:true,
        approvalDoesNotActivateLocations:true,
        noAutomaticMultiLocationRollout:true,
        autonomousProductionChanges:false
      }
    };
  }
  async createPlan(org,allowed,input,actor){
    const replication=await this.expansionReplicationService.snapshot(org,allowed);
    const approved=new Set((replication.targets||[]).filter(x=>x.approval?.status==="EXPANSION_REPLICATION_APPROVED").map(x=>x.targetLocationId));
    const cohorts=Array.isArray(input.cohorts)?input.cohorts:[];
    if(!cohorts.length)throw new Error("At least one rollout cohort is required.");
    const normalized=cohorts.map((c,i)=>{
      const ids=(Array.isArray(c.locationIds)?c.locationIds:[]).filter(id=>approved.has(id));
      if(!ids.length)throw new Error(`Cohort ${i+1} requires at least one replication-approved target.`);
      if(!c.windowStart||!c.windowEnd)throw new Error(`Cohort ${i+1} requires activation window start/end.`);
      if(!String(c.dependencyEvidence||"").trim())throw new Error(`Cohort ${i+1} requires dependency evidence.`);
      return {
        id:`cohort_${i+1}`,name:String(c.name||`Cohort ${i+1}`).trim().slice(0,160),sequence:i+1,
        locationIds:ids,window:{start:String(c.windowStart),end:String(c.windowEnd)},
        supportLoad:String(c.supportLoad||"MANAGEABLE").toUpperCase(),
        dependencyEvidence:String(c.dependencyEvidence).trim().slice(0,2400),
        blockers:(Array.isArray(c.blockers)?c.blockers:[]).map((b,j)=>({id:String(b.id||`blocker_${j+1}`),summary:String(b.summary||"").trim().slice(0,1600),status:String(b.status||"OPEN").toUpperCase()})).filter(x=>x.summary),
        status:"APPROVED"
      };
    });
    const maxConcurrent=Math.max(1,Number(input.maxConcurrentLocations)||0);
    if(!maxConcurrent)throw new Error("Maximum concurrent locations is required.");
    const supportOwner=String(input.supportOwner||"").trim(),pauseAuthority=String(input.pauseAuthority||"").trim(),evidence=String(input.evidence||"").trim();
    if(!supportOwner||!pauseAuthority||!evidence)throw new Error("Support owner, pause authority, and human expansion-plan evidence are required.");
    const record={
      id:`mle_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId:org,
      status:"ACTIVE",createdAt:this.now(),createdBy:actor,
      name:String(input.name||"Multi-location expansion plan").trim().slice(0,180),
      maxConcurrentLocations:maxConcurrent,supportOwner,pauseAuthority,evidence:evidence.slice(0,3200),
      note:String(input.note||"").trim().slice(0,1800),cohorts:normalized,
      deploymentPerformed:false,locationsActivated:false
    };
    await this.database.mutate(db=>{db.multiLocationExpansionPlans||=[];for(const x of db.multiLocationExpansionPlans.filter(x=>x.organizationId===org&&x.status==="ACTIVE"))x.status="SUPERSEDED";db.multiLocationExpansionPlans.push(record);return record;});
    await this.auditService.record({organizationId:org,actor,action:"Multi-location expansion plan created; no deployment or activation performed",category:"multi_location_expansion"});
    this.realtimeHub.publish("multi-location-expansion:plan-created",{organizationId:org,id:record.id});
    return record;
  }
  async approve(org,allowed,planId,input,actor){
    const snap=await this.snapshot(org,allowed);
    if(!snap.plan||snap.plan.id!==planId)throw new Error("Active expansion plan not found.");
    if(!snap.cohorts.length||snap.cohorts.some(x=>!x.ready))throw new Error("All rollout cohorts must pass readiness gates before plan approval.");
    if(snap.planChecks.slice(0,6).some(x=>!x.passed))throw new Error("Expansion plan readiness gates are incomplete.");
    const evidence=String(input.evidence||"").trim(),note=String(input.note||"").trim();
    if(!evidence||!note)throw new Error("Human multi-location approval evidence and note are required.");
    const record={
      id:`mla_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId:org,planId,
      status:"MULTI_LOCATION_EXPANSION_APPROVED",approvedAt:this.now(),approvedBy:actor,
      evidence:evidence.slice(0,3400),note:note.slice(0,1800),
      deploymentPerformedByApproval:false,locationsActivatedByApproval:false,autonomousProductionChanges:false
    };
    await this.database.mutate(db=>{db.multiLocationExpansionApprovals||=[];db.multiLocationExpansionApprovals.push(record);return record;});
    await this.auditService.record({organizationId:org,actor,action:"Multi-location expansion approved; approval did not deploy or activate locations",category:"multi_location_expansion"});
    this.realtimeHub.publish("multi-location-expansion:approved",{organizationId:org,planId,id:record.id});
    return record;
  }
}
module.exports=MultiLocationExpansionControlService;
