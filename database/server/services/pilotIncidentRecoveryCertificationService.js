"use strict";

class PilotIncidentRecoveryCertificationService{
  constructor(database,runtimeGuardrailService,continuityService,cutoverService){
    this.database=database;
    this.runtime=runtimeGuardrailService;
    this.continuity=continuityService;
    this.cutover=cutoverService;
  }
  now(){return new Date().toISOString();}

  async list(organizationId,allowedLocationIds=[],locationId){
    await this.runtime.evaluate(organizationId,allowedLocationIds,locationId);
    const db=await this.database.read();
    const incidents=(db.pilotRuntimeIncidents||[])
      .filter(x=>x.organizationId===organizationId&&x.locationId===locationId)
      .sort((a,b)=>new Date(b.openedAt)-new Date(a.openedAt));
    return {
      version:"80.50.0",
      generatedAt:this.now(),
      organizationId,
      locationId,
      counts:{
        total:incidents.length,
        open:incidents.filter(x=>x.status==="OPEN").length,
        investigating:incidents.filter(x=>x.status==="INVESTIGATING").length,
        resolved:incidents.filter(x=>x.status==="RESOLVED").length
      },
      incidents,
      policy:{
        rootCauseRequiredForResolution:true,
        correctiveActionRequired:true,
        recoveryEvidenceRequired:true,
        humanCertificationRequired:true,
        noAutomaticAuthorityRestore:true
      }
    };
  }

  async investigate(organizationId,allowedLocationIds=[],locationId,incidentId,input={},actor){
    await this.runtime.evaluate(organizationId,allowedLocationIds,locationId);
    let updated=null;
    await this.database.mutate(db=>{
      const incident=(db.pilotRuntimeIncidents||[]).find(x=>x.id===incidentId&&x.organizationId===organizationId&&x.locationId===locationId);
      if(!incident){const e=new Error("Pilot incident not found.");e.statusCode=404;throw e;}
      incident.status="INVESTIGATING";
      incident.investigation={
        startedAt:incident.investigation?.startedAt||this.now(),
        startedBy:incident.investigation?.startedBy||actor||"operator",
        rootCause:String(input.rootCause||incident.investigation?.rootCause||"").slice(0,1000),
        correctiveAction:String(input.correctiveAction||incident.investigation?.correctiveAction||"").slice(0,1000),
        notes:String(input.notes||incident.investigation?.notes||"").slice(0,2000)
      };
      updated={...incident};
      return true;
    });
    return updated;
  }

  async certify(organizationId,allowedLocationIds=[],locationId,incidentId,input={},actor){
    const runtime=await this.runtime.evaluate(organizationId,allowedLocationIds,locationId);
    const continuity=await this.continuity.evaluate(organizationId,allowedLocationIds,locationId);
    const db=await this.database.read();
    const incident=(db.pilotRuntimeIncidents||[]).find(x=>x.id===incidentId&&x.organizationId===organizationId&&x.locationId===locationId);
    if(!incident){const e=new Error("Pilot incident not found.");e.statusCode=404;throw e;}

    const rootCause=String(input.rootCause||incident.investigation?.rootCause||"").trim();
    const correctiveAction=String(input.correctiveAction||incident.investigation?.correctiveAction||"").trim();
    const recoveryEvidence=String(input.recoveryEvidence||"").trim();
    const provider=runtime.activeProvider;
    const providerState=continuity.providers.find(x=>x.provider===provider)||null;

    const checks={
      rootCauseDocumented:rootCause.length>=10,
      correctiveActionDocumented:correctiveAction.length>=10,
      recoveryEvidenceDocumented:recoveryEvidence.length>=10,
      continuityStable:!provider||providerState?.continuity==="STABLE",
      providerTrusted:!provider||providerState?.fallback==="TRUSTED_LIVE",
      recoveryChecksPassed:!provider||Boolean(providerState?.recoveryReady),
      noOtherCriticalIncidents:!runtime.openIncidents.some(x=>x.id!==incidentId&&x.severity==="CRITICAL")
    };

    const blockers=Object.entries(checks).filter(([,ok])=>!ok).map(([name])=>name);
    if(blockers.length){
      const e=new Error(`Recovery certification blocked: ${blockers.join(", ")}`);
      e.statusCode=409;e.blockers=blockers;throw e;
    }

    const certification={
      certifiedAt:this.now(),
      certifiedBy:actor||"operator",
      rootCause,
      correctiveAction,
      recoveryEvidence,
      checks,
      authorityRestoreApproved:false
    };

    await this.database.mutate(state=>{
      const target=(state.pilotRuntimeIncidents||[]).find(x=>x.id===incidentId);
      target.status="RESOLVED";
      target.resolvedAt=certification.certifiedAt;
      target.resolvedBy=certification.certifiedBy;
      target.investigation={...(target.investigation||{}),rootCause,correctiveAction};
      target.recoveryCertification=certification;
      return true;
    });

    return {
      incidentId,
      status:"RESOLVED",
      recoveryCertified:true,
      authorityRestoreApproved:false,
      certification,
      runtime:await this.runtime.evaluate(organizationId,allowedLocationIds,locationId)
    };
  }

  async clearEmergency(organizationId,allowedLocationIds=[],locationId,actor,reason){
    const list=await this.list(organizationId,allowedLocationIds,locationId);
    const unresolvedCritical=list.incidents.filter(x=>x.severity==="CRITICAL"&&x.status!=="RESOLVED");
    if(unresolvedCritical.length){
      const e=new Error("All critical incidents require recovery certification before emergency mode can be cleared.");
      e.statusCode=409;throw e;
    }
    return this.runtime.clearEmergency(organizationId,allowedLocationIds,locationId,actor,reason);
  }
}

module.exports=PilotIncidentRecoveryCertificationService;
