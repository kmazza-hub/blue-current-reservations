"use strict";
class V96PilotReadyCertificationService {
  constructor(database,auditService,realtimeHub,preparationService) {
    Object.assign(this,{database,auditService,realtimeHub,preparationService});
  }
  now(){return new Date().toISOString();}
  async certifications(org){
    const db=await this.database.read();
    return (db.v96PilotReadyCertifications||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.certifiedAt)-new Date(a.certifiedAt));
  }
  async snapshot(org,allowed){
    const [prep,certs]=await Promise.all([this.preparationService.current(org,allowed),this.certifications(org)]);
    const certification=certs[0]||null;
    const checks=[
      {id:"V95_75_PREPARATION_COMPLETE",passed:prep.certificationPreparationReady===true,actual:prep.status},
      {id:"LOCATION_EXIT_EVIDENCE",passed:(prep.locations||[]).length>0&&(prep.locations||[]).every(x=>x.exitReady),actual:`${(prep.locations||[]).filter(x=>x.exitReady).length}/${(prep.locations||[]).length} ready`},
      {id:"RELEASE_EVIDENCE_COMPLETE",passed:prep.evidenceCompleteness?.releaseReady===true,actual:`${prep.evidenceCompleteness?.releaseChecksPassed||0}/${prep.evidenceCompleteness?.releaseChecksTotal||0} pass`},
      {id:"HUMAN_CERTIFICATION",passed:certification?.decision==="PILOT_READY",actual:certification?.decision||"not certified"}
    ];
    return {
      version:"96.0.0",gate:"V96_PILOT_READY_CERTIFICATION",generatedAt:this.now(),
      status:certification?.decision==="PILOT_READY"?"V96_PILOT_READY_CERTIFIED":certification?.decision==="HOLD"?"V96_CERTIFICATION_HELD":prep.certificationPreparationReady?"READY_FOR_HUMAN_CERTIFICATION":"CERTIFICATION_BLOCKED",
      pilotReady:certification?.decision==="PILOT_READY",
      certificationReady:checks.slice(0,-1).every(x=>x.passed),
      checks,preparation:prep,certification,
      baseline:{
        version:"96.0.0",designation:"PILOT_READY_BASELINE",
        architectureFrozenForPilot:true,operationalSafeguardsCertified:true,
        humanControlModelPreserved:true,restaurantPilotExecutionPermittedOnlyAfterHumanCertification:true
      },
      policy:{
        humanCertificationRequired:true,certificationDoesNotDeploy:true,certificationDoesNotStartRuntime:true,
        certificationDoesNotAuthorizeExpansion:true,pilotExecutionStillUsesLaunchControls:true,
        noAutomaticGoLive:true,noAutomaticExpansion:true,autonomousProductionChanges:false
      },
      nextPhase:"V96_TO_V100_COMMERCIAL_HARDENING"
    };
  }
  async certify(org,allowed,input,actor){
    const state=await this.snapshot(org,allowed);
    if(!state.certificationReady)throw new Error("All V96 preparation gates must pass before pilot-ready certification.");
    const decision=String(input.decision||"").toUpperCase();
    if(!["PILOT_READY","HOLD"].includes(decision))throw new Error("decision must be PILOT_READY or HOLD.");
    const evidence=String(input.evidence||"").trim(),acceptance=String(input.acceptance||"").trim();
    if(!evidence||!acceptance)throw new Error("Certification evidence and human acceptance are required.");
    const record={id:`v96cert_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId:org,decision,certifiedAt:this.now(),certifiedBy:actor,evidence:evidence.slice(0,5000),acceptance:acceptance.slice(0,3500),baselineVersion:"96.0.0",deploymentPerformed:false,runtimeStarted:false,expansionAuthorized:false};
    await this.database.mutate(db=>{db.v96PilotReadyCertifications||=[];db.v96PilotReadyCertifications.push(record);return record;});
    await this.auditService.record({organizationId:org,actor,action:`V96 pilot-ready certification ${decision}`,category:"v96_pilot_ready_certification"});
    this.realtimeHub.publish("v96-pilot-ready:certified",{organizationId:org,id:record.id,decision});
    return record;
  }
}
module.exports=V96PilotReadyCertificationService;
