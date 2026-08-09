"use strict";

class OperatorSpeedWorkflowSimplificationService {
  constructor(database,auditService,realtimeHub,operatorUxHardeningService,restaurantWorkflowIntegrationService,peakServiceWorkflowResilienceService){
    Object.assign(this,{database,auditService,realtimeHub,operatorUxHardeningService,restaurantWorkflowIntegrationService,peakServiceWorkflowResilienceService});
    this.workflowIds=["OPENING","RESERVATION","ARRIVAL","SEATING","ACTIVE_SERVICE","KITCHEN","GUEST_RECOVERY","CLOSEOUT"];
  }
  now(){return new Date().toISOString();}
  async observations(org){const db=await this.database.read();return (db.operatorSpeedWorkflowObservations||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.observedAt)-new Date(a.observedAt));}
  async certifications(org){const db=await this.database.read();return (db.operatorSpeedWorkflowCertifications||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.certifiedAt)-new Date(a.certifiedAt));}
  async snapshot(org,allowed){
    const [ux,workflow,peak,obs,certs]=await Promise.all([this.operatorUxHardeningService.snapshot(org,allowed),this.restaurantWorkflowIntegrationService.snapshot(org,allowed),this.peakServiceWorkflowResilienceService.snapshot(org,allowed),this.observations(org),this.certifications(org)]);
    const locations=(workflow.locations||[]).map(loc=>{
      const history=obs.filter(x=>x.locationId===loc.locationId),latest=history[0]||null,cert=certs.find(x=>x.locationId===loc.locationId)||null;
      const flows=latest?.workflows||[];
      const avgClicks=flows.length?flows.reduce((n,x)=>n+Number(x.clicks||0),0)/flows.length:0;
      const avgSeconds=flows.length?flows.reduce((n,x)=>n+Number(x.seconds||0),0)/flows.length:0;
      const maxClicks=Number(latest?.thresholds?.maxClicks||4),maxSeconds=Number(latest?.thresholds?.maxSeconds||12);
      const highCritical=(latest?.findings||[]).filter(x=>x.status!=="RESOLVED"&&["high","critical"].includes(String(x.severity).toLowerCase()));
      const checks=[
        {id:"WORKFLOW_INTEGRATION_READY",passed:loc.workflowReady||loc.certification?.status==="RESTAURANT_WORKFLOW_INTEGRATION_CERTIFIED",actual:loc.state},
        {id:"PEAK_SERVICE_READY",passed:(peak.locations||[]).some(x=>x.locationId===loc.locationId&&(x.resilienceReady||x.certification?.decision==="READY")),actual:(peak.locations||[]).find(x=>x.locationId===loc.locationId)?.state||"not ready"},
        {id:"UX_HARDENING_ACTIVE",passed:ux.status!=="operator-ux-hardening-required",actual:ux.status},
        {id:"ALL_CORE_WORKFLOWS_OBSERVED",passed:flows.length===this.workflowIds.length&&this.workflowIds.every(id=>flows.some(x=>x.id===id)),actual:`${flows.length}/${this.workflowIds.length}`},
        {id:"CLICK_EFFICIENCY",passed:!!latest&&avgClicks<=maxClicks,actual:latest?`${avgClicks.toFixed(1)} avg / ${maxClicks} max`:"not observed"},
        {id:"ACTION_LATENCY",passed:!!latest&&avgSeconds<=maxSeconds,actual:latest?`${avgSeconds.toFixed(1)}s avg / ${maxSeconds}s max`:"not observed"},
        {id:"HANDOFF_CLARITY",passed:latest?.handoffClarity==="PASS",actual:latest?.handoffClarity||"not assessed"},
        {id:"PRIORITY_VISIBILITY",passed:latest?.priorityVisibility==="PASS",actual:latest?.priorityVisibility||"not assessed"},
        {id:"EXCEPTION_VISIBILITY",passed:latest?.exceptionVisibility==="PASS",actual:latest?.exceptionVisibility||"not assessed"},
        {id:"NO_HIGH_CRITICAL_FRICTION",passed:highCritical.length===0,actual:`${highCritical.length} high/critical finding(s)`},
        {id:"HUMAN_USABILITY_CERTIFICATION",passed:!!cert,actual:cert?.decision||"not certified"}
      ];
      return {locationId:loc.locationId,locationName:loc.locationName,latestObservation:latest,certification:cert,checks,passed:checks.filter(x=>x.passed).length,total:checks.length,usabilityReady:checks.slice(0,-1).every(x=>x.passed),metrics:{averageClicks:Number(avgClicks.toFixed(2)),averageSeconds:Number(avgSeconds.toFixed(2)),maxClicks,maxSeconds},state:cert?.decision==="READY"?"SERVICE_UX_READY":cert?.decision==="REVISE"?"SERVICE_UX_REVISE":cert?.decision==="HOLD"?"SERVICE_UX_HOLD":latest?"SERVICE_UX_OBSERVED":"SERVICE_UX_OBSERVATION_REQUIRED"};
    });
    return {version:"54.25.0",generatedAt:this.now(),status:locations.some(x=>x.certification?.decision==="READY")?"service-ux-ready":locations.some(x=>x.latestObservation)?"service-ux-in-review":"service-ux-observation-required",headline:`${locations.filter(x=>x.usabilityReady).length}/${locations.length} location(s) satisfy operator-speed and service-UX gates.`,locations,policy:{coreWorkflowTimingRequired:true,clickEfficiencyRequired:true,actionLatencyRequired:true,handoffClarityRequired:true,priorityVisibilityRequired:true,exceptionVisibilityRequired:true,humanReadyReviseHoldDecisionRequired:true,certificationDoesNotRedesignWorkflow:true,certificationDoesNotExecuteRestaurantActions:true,autonomousProductionChanges:false}};
  }
  async observe(org,allowed,locationId,input,actor){
    const workflows=(Array.isArray(input.workflows)?input.workflows:[]).map(x=>({id:String(x.id||"").toUpperCase(),clicks:Math.max(0,Number(x.clicks)||0),seconds:Math.max(0,Number(x.seconds)||0)}));
    if(this.workflowIds.some(id=>!workflows.some(x=>x.id===id)))throw new Error("All eight core workflows require timing/click observations.");
    for(const k of ["handoffClarity","priorityVisibility","exceptionVisibility"]){if(!["PASS","FAIL"].includes(String(input[k]||"").toUpperCase()))throw new Error(`${k} must be PASS or FAIL.`);}
    const evidence=String(input.evidence||"").trim();if(!evidence)throw new Error("Human usability evidence is required.");
    const record={id:`osw_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId:org,locationId,observedAt:this.now(),observedBy:actor,workflows,thresholds:{maxClicks:Math.max(1,Number(input.maxClicks)||4),maxSeconds:Math.max(1,Number(input.maxSeconds)||12)},handoffClarity:String(input.handoffClarity).toUpperCase(),priorityVisibility:String(input.priorityVisibility).toUpperCase(),exceptionVisibility:String(input.exceptionVisibility).toUpperCase(),evidence:evidence.slice(0,4000),findings:Array.isArray(input.findings)?input.findings:[],note:String(input.note||"").trim().slice(0,2200),workflowRedesignedAutomatically:false,restaurantActionExecuted:false};
    await this.database.mutate(db=>{db.operatorSpeedWorkflowObservations||=[];db.operatorSpeedWorkflowObservations.push(record);return record;});
    await this.auditService.record({organizationId:org,actor,action:`Operator-speed observation recorded for ${locationId}`,category:"operator_speed_workflow"});return record;
  }
  async certify(org,allowed,locationId,input,actor){
    const state=await this.snapshot(org,allowed),loc=state.locations.find(x=>x.locationId===locationId);if(!loc?.latestObservation)throw new Error("Usability observation required before certification.");
    const decision=String(input.decision||"").toUpperCase(),evidence=String(input.evidence||"").trim(),reason=String(input.reason||"").trim();
    if(!["READY","REVISE","HOLD"].includes(decision))throw new Error("Decision must be READY, REVISE, or HOLD.");if(!evidence)throw new Error("Certification evidence required.");if(decision==="READY"&&!loc.usabilityReady&&!reason)throw new Error("READY with open gates requires a documented override.");if(["REVISE","HOLD"].includes(decision)&&!reason)throw new Error(`${decision} requires a reason.`);
    const record={id:`oswc_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId:org,locationId,decision,status:"OPERATOR_SPEED_WORKFLOW_CERTIFIED",certifiedAt:this.now(),certifiedBy:actor,evidence:evidence.slice(0,4000),reason:reason.slice(0,2200),gateSnapshot:loc.checks,workflowRedesignedByCertification:false,restaurantActionsExecutedByCertification:false,autonomousProductionChanges:false};
    await this.database.mutate(db=>{db.operatorSpeedWorkflowCertifications||=[];db.operatorSpeedWorkflowCertifications.push(record);return record;});return record;
  }
}
module.exports=OperatorSpeedWorkflowSimplificationService;
