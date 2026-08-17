"use strict";

class PilotObservabilityAlertingSupportReadinessService {
  constructor(pilotRuntimeObservabilityIncidentService) {
    this.observability=pilotRuntimeObservabilityIncidentService;
  }
  async current(organizationId) {
    const runtime=await this.observability.current(organizationId);
    const view=runtime.observability||null;
    const summary=view?.summary||{metrics:0,incidents:0,openIncidents:0,criticalOpen:0,escalated:0};
    const active=Boolean(runtime.runtime?.activeSession);
    const state=summary.criticalOpen>0?"CRITICAL":
      summary.openIncidents>0?"ATTENTION":
      active?"MONITORING":"STANDBY";
    return {
      version:"93.50.0",
      gate:"PILOT_OBSERVABILITY_ALERTING_AND_SUPPORT_READINESS",
      generatedAt:new Date().toISOString(),
      state,
      activeSession:active,
      summary,
      supportReadiness:{
        runtimeMetricsVisible:true,
        incidentTimelineVisible:true,
        criticalIncidentPauseGuard:true,
        acknowledgementSupported:true,
        escalationSupported:true,
        resolutionEvidenceRequired:true,
        humanSupportOwnershipRequired:true
      },
      escalationPolicy:{
        INFO:"observe-and-document",
        WARNING:"operator-acknowledge-and-own",
        HIGH:"manager-escalation-required",
        CRITICAL:"pause-protect-escalate-recover-verify"
      },
      supportBoundary:{
        observabilityDoesNotExecuteOperations:true,
        automaticRemediation:false,
        automaticResolution:false,
        providerWriteBack:false,
        autonomousProductionChanges:false
      },
      nextGate:"PILOT_SECURITY_ACCESS_AND_AUDIT_READINESS"
    };
  }
}
module.exports=PilotObservabilityAlertingSupportReadinessService;
