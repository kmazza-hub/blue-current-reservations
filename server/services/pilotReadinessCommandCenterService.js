"use strict";

class PilotReadinessCommandCenterService {
  constructor(database,deps={}){this.database=database;Object.assign(this,deps);}
  now(){return new Date().toISOString();}
  allowed(id,allowed=[]){return allowed.includes("*")||allowed.includes(id);}

  async snapshot(organizationId,allowedLocationIds=[]){
    const db=await this.database.read();
    const locations=(db.locations||[]).filter(x=>x.organizationId===organizationId&&this.allowed(x.id,allowedLocationIds));

    const safe=async(fn,fallback)=>{try{return await fn();}catch(error){return {...fallback,error:error.message};}};
    const [technical,pilotOps,production,workflow,failure,mutation,integrity]=await Promise.all([
      safe(()=>this.technicalActivationReadinessService.snapshot(organizationId,allowedLocationIds),{locations:[],blockerCount:1}),
      safe(()=>this.pilotOperationalReadinessService.snapshot(organizationId,allowedLocationIds),{locations:[],status:"unavailable"}),
      safe(()=>this.productionPilotEnvironmentReadinessService.snapshot(organizationId,allowedLocationIds),{locations:[],status:"unavailable"}),
      safe(()=>this.restaurantWorkflowCertificationService.certify(organizationId),{pilotWorkflowReady:false,issues:[{severity:"critical",code:"WORKFLOW_CERT_UNAVAILABLE"}]}),
      safe(()=>this.liveShiftFailureCertificationService.certify(organizationId),{liveShiftFailureReady:false,issues:[{severity:"critical",code:"FAILURE_CERT_UNAVAILABLE"}]}),
      safe(()=>this.productionMutationIntegrityService.snapshot(organizationId),{healthy:false,reconcileRequired:1,stalePrepared:1}),
      safe(()=>this.operationalDataIntegrityService.certify(),{certified:false,summary:{critical:1,high:0,total:1}})
    ]);

    const byId=(arr,id)=>Array.isArray(arr)?arr.find(x=>x.locationId===id):null;
    const locationResults=locations.map(loc=>{
      const tech=byId(technical.locations,loc.id);
      const pilot=byId(pilotOps.locations,loc.id);
      const prod=byId(production.locations,loc.id);

      const checks=[
        {id:"technical-readiness",label:"Technical activation readiness",passed:!!tech?.technicallyReady,required:true,detail:tech?`${tech.requiredPassed}/${tech.requiredTotal} required checks`:"location readiness unavailable"},
        {id:"pilot-operational-readiness",label:"Pilot operational readiness",passed:!!(pilot?.ready||pilot?.pilotReady||pilot?.operationallyReady||pilot?.status?.includes?.("ready")||pilot?.status?.includes?.("certified")),required:true,detail:pilot?.status||pilot?.headline||"not certified"},
        {id:"production-environment",label:"Production pilot environment",passed:!!(prod?.ready||prod?.productionReady||prod?.status?.includes?.("ready")||prod?.status?.includes?.("certified")),required:true,detail:prod?.status||prod?.headline||"not certified"},
        {id:"workflow-integrity",label:"End-to-end restaurant workflow",passed:workflow.pilotWorkflowReady===true,required:true,detail:`${workflow.issues?.length||0} workflow issue(s)`},
        {id:"failure-recovery",label:"Live-shift failure and recovery",passed:failure.liveShiftFailureReady===true,required:true,detail:`${failure.issues?.length||0} failure-path issue(s)`},
        {id:"mutation-integrity",label:"Mutation/restart integrity",passed:mutation.healthy!==false&&!mutation.reconcileRequired&&!mutation.stalePrepared,required:true,detail:`${mutation.reconcileRequired||0} reconcile-required · ${mutation.stalePrepared||0} stale prepared`},
        {id:"operational-data-integrity",label:"Operational data integrity",passed:integrity.certified===true,required:true,detail:`${integrity.summary?.total||0} integrity issue(s)`}
      ];
      const blockers=checks.filter(x=>x.required&&!x.passed);
      const warnings=checks.filter(x=>!x.required&&!x.passed);
      const passed=checks.length-blockers.length;
      const score=Math.round(passed/checks.length*100);
      const decision=blockers.length===0?(warnings.length?"GO_WITH_WARNINGS":"GO"):"NO_GO";
      return {locationId:loc.id,locationName:loc.name||loc.displayName||loc.id,decision,score,passed,total:checks.length,blockers,warnings,checks};
    });

    const blockerCount=locationResults.reduce((n,x)=>n+x.blockers.length,0);
    const decisions=new Set(locationResults.map(x=>x.decision));
    const decision=locations.length===0?"NO_GO":decisions.has("NO_GO")?"NO_GO":decisions.has("GO_WITH_WARNINGS")?"GO_WITH_WARNINGS":"GO";

    return {
      version:"74.0.0",generatedAt:this.now(),organizationId,
      decision,
      headline:decision==="GO"
        ?"Blue Current satisfies the consolidated technical and operational gates for this pilot scope."
        :decision==="GO_WITH_WARNINGS"
          ?"Blue Current satisfies required pilot gates with documented warnings."
          :"Blue Current has unresolved required pilot blockers. Do not begin production service.",
      locationCount:locations.length,blockerCount,
      locations:locationResults,
      sourceStatus:{
        technical:technical.status||null,
        pilotOperations:pilotOps.status||null,
        productionEnvironment:production.status||null,
        workflowReady:workflow.pilotWorkflowReady===true,
        failureReady:failure.liveShiftFailureReady===true,
        mutationHealthy:mutation.healthy!==false,
        operationalIntegrity:integrity.certified===true
      },
      policy:{
        humanGoLiveDecisionRequired:true,
        noAutomaticCutover:true,
        noAutomaticOverride:true,
        noAutomaticRepair:true,
        noAutomaticProductionMutation:true,
        noGoBlocksPilotRecommendation:true
      }
    };
  }
}
module.exports=PilotReadinessCommandCenterService;
