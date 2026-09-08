"use strict";

class PilotDeviceNetworkOnsiteContinuityReadinessService {
  constructor(failureRecoveryShiftContinuityService) {
    this.failureRecoveryShiftContinuityService=failureRecoveryShiftContinuityService;
  }
  async current(organizationId,allowedLocationIds) {
    const continuity=await this.failureRecoveryShiftContinuityService.snapshot(organizationId,allowedLocationIds);
    const locations=(continuity.locations||[]).map(loc=>{
      const byId=new Map((loc.checks||[]).map(x=>[x.id,x]));
      const required=[
        "SCENARIO_API_FAILURE","SCENARIO_CONNECTOR_FAILURE","SCENARIO_STALE_DATA",
        "SCENARIO_OFFLINE_CONTINUITY","SCENARIO_DEVICE_SURFACE_FAILURE",
        "SCENARIO_RECONNECT_RECONCILIATION","FALLBACK_RUNBOOK","ESCALATION_OWNER",
        "RECOVERY_TIME_OBJECTIVE","SHIFT_CONTINUITY","NO_HIGH_CRITICAL_FINDINGS"
      ];
      const checks=required.map(id=>byId.get(id)).filter(Boolean);
      return {
        locationId:loc.locationId,locationName:loc.locationName,state:loc.state,
        checks,passed:checks.filter(x=>x.passed).length,total:checks.length,
        ready:checks.length===required.length && checks.every(x=>x.passed)
      };
    });
    return {
      version:"94.25.0",
      gate:"PILOT_DEVICE_NETWORK_AND_ONSITE_CONTINUITY_READINESS",
      generatedAt:new Date().toISOString(),
      ready:locations.length>0 && locations.every(x=>x.ready),
      locations,
      continuityCoverage:{
        apiFailure:true,connectorFailure:true,staleDataProtection:true,
        offlineContinuity:true,deviceSurfaceFailure:true,reconnectReconciliation:true
      },
      onsiteBoundary:{
        fallbackRunbookRequired:true,
        escalationOwnerRequired:true,
        recoveryTimeObjectiveRequired:true,
        shiftContinuityRequired:true,
        humanRecoverDegradedHoldDecisionRequired:true,
        automaticRepair:false,
        automaticOperationalMutation:false
      },
      nextGate:"PILOT_TRAINING_RUNBOOK_AND_OPERATOR_ENABLEMENT_READINESS"
    };
  }
}
module.exports=PilotDeviceNetworkOnsiteContinuityReadinessService;
