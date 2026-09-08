"use strict";

class ExpansionCohortObservationService {
  constructor(database,auditService,realtimeHub,multiLocationExpansionControlService){
    Object.assign(this,{database,auditService,realtimeHub,multiLocationExpansionControlService});
  }
  now(){return new Date().toISOString();}
  async activations(org){
    const db=await this.database.read();
    return (db.expansionCohortActivations||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.activatedAt)-new Date(a.activatedAt));
  }
  async observations(org){
    const db=await this.database.read();
    return (db.expansionCohortObservations||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.observedAt)-new Date(a.observedAt));
  }
  async decisions(org){
    const db=await this.database.read();
    return (db.expansionCohortDecisions||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.decidedAt)-new Date(a.decidedAt));
  }
  severityRank(v){return {none:0,low:1,medium:2,high:3,critical:4}[String(v||"none").toLowerCase()]??0;}
  async snapshot(org,allowed){
    const [control,activations,observations,decisions]=await Promise.all([
      this.multiLocationExpansionControlService.snapshot(org,allowed),
      this.activations(org),this.observations(org),this.decisions(org)
    ]);
    const plan=control.plan||null,planApproved=control.approval?.status==="MULTI_LOCATION_EXPANSION_APPROVED";
    const cohorts=(control.cohorts||[]).map(c=>{
      const activation=activations.find(x=>x.planId===plan?.id&&x.cohortId===c.id)||null;
      const obs=observations.filter(x=>x.activationId===activation?.id);
      const latest=obs[0]||null;
      const decision=decisions.find(x=>x.activationId===activation?.id)||null;
      const highCritical=obs.filter(x=>this.severityRank(x.severity)>=3).length;
      const supportOk=!!latest&&["LOW","MANAGEABLE"].includes(String(latest.supportLoad||"").toUpperCase());
      const allLocationsConfirmed=!!activation&&activation.locations.length>0&&activation.locations.every(x=>x.status==="CONFIRMED");
      const checks=[
        {id:"PLAN_APPROVED",passed:planApproved,actual:control.approval?.status||"not approved"},
        {id:"COHORT_READY",passed:c.ready===true,actual:`${c.passed}/${c.total} cohort gates`},
        {id:"HUMAN_ACTIVATION_RECORD",passed:!!activation,actual:activation?.activatedAt||"not activated"},
        {id:"LOCATION_CONFIRMATION",passed:allLocationsConfirmed,actual:activation?`${activation.locations.filter(x=>x.status==="CONFIRMED").length}/${activation.locations.length} confirmed`:"not recorded"},
        {id:"HEALTH_OBSERVATION",passed:!!latest,actual:latest?.observedAt||"not observed"},
        {id:"SUPPORT_LOAD",passed:supportOk,actual:latest?.supportLoad||"not observed"},
        {id:"NO_HIGH_CRITICAL_INCIDENTS",passed:highCritical===0,actual:`${highCritical} high/critical incident(s)`},
        {id:"HUMAN_COHORT_DECISION",passed:!!decision,actual:decision?.decision||"not decided"}
      ];
      return {
        cohortId:c.id,cohortName:c.name,sequence:c.sequence,locations:c.locations,
        activation,observations:obs.slice(0,10),latestObservation:latest,decision,
        highCriticalIncidents:highCritical,
        checks,passed:checks.filter(x=>x.passed).length,total:checks.length,
        continueEligible:!!activation&&allLocationsConfirmed&&!!latest&&supportOk&&highCritical===0,
        state:decision?.decision||activation?"OBSERVING":"AWAITING_ACTIVATION"
      };
    });
    return {
      version:"52.25.0",generatedAt:this.now(),
      status:cohorts.some(x=>x.decision?.decision==="PAUSE"||x.decision?.decision==="HOLD")?"expansion-cohort-paused":cohorts.some(x=>x.activation)?"expansion-cohort-observing":"expansion-cohort-awaiting-activation",
      headline:`${cohorts.filter(x=>x.activation).length}/${cohorts.length} cohort(s) have activation records; ${cohorts.reduce((n,x)=>n+x.highCriticalIncidents,0)} high/critical incident(s) observed.`,
      planId:plan?.id||null,planApproved,cohorts,
      policy:{
        approvedPlanRequired:true,
        explicitHumanCohortActivationRequired:true,
        perLocationConfirmationRequired:true,
        healthObservationRequired:true,
        supportLoadObservationRequired:true,
        humanContinuePauseHoldRequired:true,
        continueDoesNotActivateNextCohort:true,
        pauseDoesNotMutateRestaurantState:true,
        noAutomaticCohortActivation:true,
        noAutomaticDeployment:true,
        autonomousProductionChanges:false
      }
    };
  }
  async activate(org,allowed,cohortId,input,actor){
    const control=await this.multiLocationExpansionControlService.snapshot(org,allowed);
    if(control.approval?.status!=="MULTI_LOCATION_EXPANSION_APPROVED")throw new Error("Human multi-location expansion approval is required before cohort activation.");
    const cohort=(control.cohorts||[]).find(x=>x.id===cohortId);
    if(!cohort||!cohort.ready)throw new Error("Cohort must pass readiness gates before activation can be recorded.");
    const evidence=String(input.evidence||"").trim(),owner=String(input.activationOwner||"").trim();
    if(!evidence||!owner)throw new Error("Human activation evidence and activation owner are required.");
    const existing=(await this.activations(org)).find(x=>x.planId===control.plan.id&&x.cohortId===cohortId);
    if(existing)throw new Error("This cohort already has an activation record.");
    const record={
      id:`eca_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      organizationId:org,planId:control.plan.id,cohortId,cohortName:cohort.name,sequence:cohort.sequence,
      activatedAt:this.now(),activatedBy:actor,activationOwner:owner,evidence:evidence.slice(0,3200),
      note:String(input.note||"").trim().slice(0,1800),
      locations:cohort.locations.map(x=>({locationId:x.locationId,locationName:x.locationName,status:"CONFIRMED",confirmedBy:actor,confirmedAt:this.now()})),
      deploymentPerformed:false,locationStateMutated:false,automaticActivation:false
    };
    await this.database.mutate(db=>{db.expansionCohortActivations||=[];db.expansionCohortActivations.push(record);return record;});
    await this.auditService.record({organizationId:org,actor,action:`Expansion cohort ${cohort.name} activation recorded; no deployment or location-state mutation performed`,category:"expansion_cohort"});
    this.realtimeHub.publish("expansion-cohort:activated",{organizationId:org,cohortId,id:record.id});
    return record;
  }
  async observe(org,allowed,activationId,input,actor){
    const snap=await this.snapshot(org,allowed);
    const cohort=snap.cohorts.find(x=>x.activation?.id===activationId);
    if(!cohort)throw new Error("Expansion cohort activation not found.");
    const severity=String(input.severity||"none").toLowerCase();
    if(!["none","low","medium","high","critical"].includes(severity))throw new Error("Severity must be none, low, medium, high, or critical.");
    const supportLoad=String(input.supportLoad||"").toUpperCase();
    if(!["LOW","MANAGEABLE","HIGH","CRITICAL"].includes(supportLoad))throw new Error("Support load must be LOW, MANAGEABLE, HIGH, or CRITICAL.");
    const incident=String(input.incident||"").trim();
    if(["high","critical"].includes(severity)&&!incident)throw new Error("High/Critical observation requires an incident description.");
    const health={
      apiHealthy:input.apiHealthy===true,authenticationHealthy:input.authenticationHealthy===true,
      reservationHealthy:input.reservationHealthy===true,floorHealthy:input.floorHealthy===true,
      kitchenHealthy:input.kitchenHealthy===true,supportBridgeHealthy:input.supportBridgeHealthy===true
    };
    const record={
      id:`eco_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      organizationId:org,activationId,cohortId:cohort.cohortId,cohortName:cohort.cohortName,
      observedAt:this.now(),observedBy:actor,severity,supportLoad,health,
      incident:incident.slice(0,2200),note:String(input.note||"").trim().slice(0,1800),
      automaticMitigationPerformed:false,automaticPausePerformed:false
    };
    await this.database.mutate(db=>{db.expansionCohortObservations||=[];db.expansionCohortObservations.push(record);return record;});
    await this.auditService.record({organizationId:org,actor,action:`Expansion cohort ${cohort.cohortName} observation recorded: ${severity}`,category:"expansion_cohort"});
    this.realtimeHub.publish("expansion-cohort:observed",{organizationId:org,activationId,severity});
    return record;
  }
  async decide(org,allowed,activationId,input,actor){
    const snap=await this.snapshot(org,allowed);
    const cohort=snap.cohorts.find(x=>x.activation?.id===activationId);
    if(!cohort)throw new Error("Expansion cohort activation not found.");
    const decision=String(input.decision||"").toUpperCase(),evidence=String(input.evidence||"").trim(),reason=String(input.reason||"").trim();
    if(!["CONTINUE","PAUSE","HOLD"].includes(decision))throw new Error("Decision must be CONTINUE, PAUSE, or HOLD.");
    if(!evidence)throw new Error("Human cohort decision evidence is required.");
    if(decision==="CONTINUE"&&!cohort.continueEligible&&!reason)throw new Error("CONTINUE with open observation gates requires a documented executive reason.");
    if(["PAUSE","HOLD"].includes(decision)&&!reason)throw new Error(`${decision} requires a documented human reason.`);
    const record={
      id:`ecd_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      organizationId:org,activationId,cohortId:cohort.cohortId,cohortName:cohort.cohortName,
      decision,decidedAt:this.now(),decidedBy:actor,evidence:evidence.slice(0,3200),reason:reason.slice(0,2200),
      observationSnapshot:{count:cohort.observations.length,highCriticalIncidents:cohort.highCriticalIncidents,continueEligible:cohort.continueEligible},
      nextCohortActivatedByDecision:false,restaurantStateMutatedByDecision:false,autonomousProductionChanges:false
    };
    await this.database.mutate(db=>{db.expansionCohortDecisions||=[];db.expansionCohortDecisions.push(record);return record;});
    await this.auditService.record({organizationId:org,actor,action:`Expansion cohort decision ${decision} recorded; no next-cohort activation performed`,category:"expansion_cohort"});
    this.realtimeHub.publish("expansion-cohort:decision",{organizationId:org,activationId,decision});
    return record;
  }
}
module.exports=ExpansionCohortObservationService;
