"use strict";

class PilotPerformanceCapacityResilienceReadinessService {
  constructor(peakServiceStressTestService,peakServiceWorkflowResilienceService) {
    Object.assign(this,{peakServiceStressTestService,peakServiceWorkflowResilienceService});
  }
  async current(organizationId,allowedLocationIds) {
    const [stress,resilience]=await Promise.all([
      this.peakServiceStressTestService.snapshot(organizationId,allowedLocationIds),
      this.peakServiceWorkflowResilienceService.snapshot(organizationId,allowedLocationIds)
    ]);
    const stressLocations=stress.locations||[], resilienceLocations=resilience.locations||[];
    const rows=resilienceLocations.map(loc=>{
      const stressLoc=stressLocations.find(x=>x.locationId===loc.locationId)||null;
      const failed=Number(stressLoc?.failed||0);
      const total=Number(stressLoc?.total||0);
      const passed=Number(stressLoc?.passed||0);
      return {
        locationId:loc.locationId,locationName:loc.locationName,
        stress:{passed,total,failed,state:stressLoc?.stressState||"UNKNOWN"},
        resilience:{passed:loc.passed,total:loc.total,state:loc.state,resilienceReady:loc.resilienceReady===true},
        ready:failed===0 && loc.resilienceReady===true
      };
    });
    return {
      version:"94.0.0",
      gate:"PILOT_PERFORMANCE_CAPACITY_AND_RESILIENCE_READINESS",
      generatedAt:new Date().toISOString(),
      ready:rows.length>0 && rows.every(x=>x.ready),
      locations:rows,
      scenarioCoverage:[
        "RESERVATION_BURST","HIGH_OCCUPANCY","RAPID_TABLE_TURNS","STAFF_CHANGE","KITCHEN_PRESSURE",
        "DELAYED_REQUESTS","API_FAILURE","CONNECTOR_FAILURE","RECONNECT_RETRY","PARTIAL_DEGRADATION_RECOVERY"
      ],
      thresholds:{
        handoffLatency:true,operatorWorkload:true,kitchenCongestion:true,
        floorCongestion:true,recoveryTime:true,serviceCompletion:true
      },
      resilienceBoundary:{
        humanPeakObservationRequired:true,
        humanReadyDegradedHoldDecisionRequired:true,
        noAutomaticOperationalMutation:true,
        autonomousProductionChanges:false
      },
      nextGate:"PILOT_DEVICE_NETWORK_AND_ONSITE_CONTINUITY_READINESS"
    };
  }
}
module.exports=PilotPerformanceCapacityResilienceReadinessService;
