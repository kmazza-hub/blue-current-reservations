"use strict";

class ArchitectureFreezeService{
  constructor(){
    this.version="85.0.0";
    this.authoritativeDomains=[
      {domain:"guest_reservations",authority:"reservation operations",changeClass:"PILOT_HARDENING"},
      {domain:"live_floor_service",authority:"live floor operations",changeClass:"PILOT_HARDENING"},
      {domain:"staff_workforce",authority:"staff operations",changeClass:"PILOT_HARDENING"},
      {domain:"kitchen",authority:"kitchen operations",changeClass:"PILOT_HARDENING"},
      {domain:"business_profitability",authority:"business intelligence",changeClass:"PILOT_HARDENING"},
      {domain:"portfolio_exceptions",authority:"portfolioExceptionCommandService",changeClass:"PILOT_HARDENING"},
      {domain:"executive_decisions",authority:"portfolioDecisionAccountabilityService",changeClass:"PILOT_HARDENING"},
      {domain:"decision_outcomes",authority:"executiveDecisionOutcomeIntelligenceService",changeClass:"PILOT_HARDENING"},
      {domain:"organizational_learning",authority:"portfolioLearningPlaybookIntelligenceService",changeClass:"PILOT_HARDENING"},
      {domain:"playbook_evidence",authority:"playbookEvidenceLifecycleService",changeClass:"PILOT_HARDENING"},
      {domain:"playbook_governance",authority:"playbookGovernanceAuthorityService",changeClass:"PILOT_HARDENING"},
      {domain:"executive_intelligence_read_model",authority:"intelligenceConsolidationService",changeClass:"PILOT_HARDENING"}
    ];
  }
  build(){
    return {
      version:this.version,
      status:"ARCHITECTURE_FROZEN",
      baseline:"PILOT_BUILD_BASELINE",
      frozenAt:"V85.0.0",
      domains:this.authoritativeDomains,
      rules:{
        newMajorCapabilityRequiresPilotEvidence:true,
        duplicateDomainAuthorityProhibited:true,
        duplicateWritePathsProhibited:true,
        existingCompatibilityLayersMayRemain:true,
        integrationWorkAllowed:true,
        configurationWorkAllowed:true,
        uxSimplificationAllowed:true,
        reliabilityAndSecurityWorkAllowed:true,
        pilotDefectFixesAllowed:true,
        autonomousProductionChanges:false
      },
      postFreezePriorities:[
        "INTEGRATION_READINESS",
        "RESTAURANT_CONFIGURATION",
        "COMMAND_FIRST_UX",
        "SECURITY_RELIABILITY_RECOVERY",
        "PILOT_CERTIFICATION"
      ]
    };
  }
}
module.exports=ArchitectureFreezeService;
