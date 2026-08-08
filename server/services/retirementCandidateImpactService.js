"use strict";
class RetirementCandidateImpactService{
  constructor(impactService,assuranceService){this.impactService=impactService;this.assuranceService=assuranceService;}
  analyze(surfaceIds=[]){
    const ids=[...new Set((Array.isArray(surfaceIds)?surfaceIds:[]).map(x=>String(x||"").trim()).filter(Boolean))].slice(0,80);
    const assurance=this.assuranceService.snapshot();
    if(!assurance.nextCandidateGate?.eligible)return {version:"46.60.0",gateOpen:false,reason:assurance.nextCandidateGate?.reason||"Post-retirement assurance is not ready.",items:[]};
    const retired=new Set((assurance.items||[]).map(x=>x.surfaceId).filter(Boolean));
    const items=ids.filter(id=>!retired.has(id)).map(id=>{
      const x=this.impactService.analyze(id),operationalInbound=(x.graph.inboundReferences||[]).filter(r=>["reference","startup-registry","html-registration"].includes(r.type)).length;
      return {surfaceId:id,status:x.status,impact:{ownedFiles:x.impact.ownedFiles,startupDependencies:x.impact.startupDependencies,apiReferences:x.impact.apiReferences,testReferences:x.impact.testReferences,operationalInboundReferences:operationalInbound,totalReferences:x.graph.referenceCount},blockers:x.blockers||[],rollbackFileCount:x.rollback?.filesToBackup?.length||0,deleteEndpointPresent:false,deletionExecuted:false};
    });
    return {version:"46.60.0",gateOpen:true,assuranceDigest:assurance.digest,retired:[...retired],items,safety:{readOnly:true,automaticSelection:false,automaticDeletion:false}};
  }
}
module.exports=RetirementCandidateImpactService;
