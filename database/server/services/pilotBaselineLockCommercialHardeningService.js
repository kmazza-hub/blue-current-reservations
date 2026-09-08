"use strict";
class PilotBaselineLockCommercialHardeningService {
  constructor(v96CertificationService,architectureFreezeService) {
    Object.assign(this,{v96CertificationService,architectureFreezeService});
  }
  async snapshot(organizationId,allowedLocationIds) {
    const certification=await this.v96CertificationService.snapshot(organizationId,allowedLocationIds);
    const freeze=this.architectureFreezeService.build();
    const pilotCertified=certification.pilotReady===true;
    const checks=[
      {id:"V96_PILOT_READY_CERTIFIED",passed:pilotCertified,actual:certification.status},
      {id:"ARCHITECTURE_AUTHORITY_FROZEN",passed:freeze.status==="ARCHITECTURE_FROZEN",actual:freeze.status},
      {id:"DUPLICATE_DOMAIN_AUTHORITY_PROHIBITED",passed:freeze.rules?.duplicateDomainAuthorityProhibited===true,actual:String(freeze.rules?.duplicateDomainAuthorityProhibited===true)},
      {id:"DUPLICATE_WRITE_PATHS_PROHIBITED",passed:freeze.rules?.duplicateWritePathsProhibited===true,actual:String(freeze.rules?.duplicateWritePathsProhibited===true)},
      {id:"PILOT_DEFECT_FIXES_ALLOWED",passed:freeze.rules?.pilotDefectFixesAllowed===true,actual:String(freeze.rules?.pilotDefectFixesAllowed===true)},
      {id:"UX_SIMPLIFICATION_ALLOWED",passed:freeze.rules?.uxSimplificationAllowed===true,actual:String(freeze.rules?.uxSimplificationAllowed===true)},
      {id:"RELIABILITY_SECURITY_ALLOWED",passed:freeze.rules?.reliabilityAndSecurityWorkAllowed===true,actual:String(freeze.rules?.reliabilityAndSecurityWorkAllowed===true)},
      {id:"NEW_MAJOR_CAPABILITY_REQUIRES_EVIDENCE",passed:freeze.rules?.newMajorCapabilityRequiresPilotEvidence===true,actual:String(freeze.rules?.newMajorCapabilityRequiresPilotEvidence===true)}
    ];
    return {
      version:"96.25.0",gate:"PILOT_BASELINE_LOCK_AND_COMMERCIAL_HARDENING_ENTRY",generatedAt:new Date().toISOString(),
      entryReady:checks.every(x=>x.passed),status:checks.every(x=>x.passed)?"COMMERCIAL_HARDENING_ENTRY_READY":"PILOT_BASELINE_LOCK_PENDING",
      checks,
      lockedBaseline:{
        version:"96.0.0",designation:"PILOT_READY_BASELINE",certificationId:certification.certification?.id||null,
        architectureAuthorityCount:(freeze.domains||[]).length,architectureAuthorityFrozen:true
      },
      allowedChangeClasses:[
        "PILOT_DEFECT_FIX","UX_SIMPLIFICATION","RELIABILITY_HARDENING","SECURITY_HARDENING",
        "OBSERVABILITY_HARDENING","SUPPORTABILITY_HARDENING","DEPLOYMENT_DISCIPLINE","COMMERCIAL_RELEASE_PREPARATION"
      ],
      restrictedChangeClasses:[
        "UNVALIDATED_MAJOR_CAPABILITY","DUPLICATE_DOMAIN_AUTHORITY","DUPLICATE_WRITE_PATH","AUTONOMOUS_PRODUCTION_CHANGE"
      ],
      commercialHardeningPriorities:[
        "REAL_WORLD_PILOT_EVIDENCE","OPERATOR_FRICTION_REMOVAL","PRODUCTION_RELIABILITY",
        "SECURITY_AND_ACCESS","OBSERVABILITY_AND_SUPPORT","DEPLOYMENT_AND_ROLLBACK",
        "COMMERCIAL_RELEASE_CERTIFICATION"
      ],
      policy:{
        v96BaselineMustRemainRecoverable:true,majorCapabilityRequiresPilotEvidence:true,
        humanChangeApprovalPreserved:true,noAutomaticExpansion:true,noAutomaticProductionMutation:true,
        autonomousProductionChanges:false
      },
      nextGate:"COMMERCIAL_HARDENING_DEFECT_AND_FRICTION_CONTROL"
    };
  }
}
module.exports=PilotBaselineLockCommercialHardeningService;
