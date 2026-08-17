"use strict";

class PilotFinalGoLiveLaunchAuthorizationService {
  constructor(database,environment,backup,support,security,performance,continuity,enablement,pilotLaunchControlService) {
    Object.assign(this,{database,environment,backup,support,security,performance,continuity,enablement,pilotLaunchControlService});
  }
  async current(organizationId,allowedLocationIds) {
    const [environment,backup,support,security,performance,continuity,enablement,launch]=await Promise.all([
      this.environment.current(organizationId,allowedLocationIds),
      this.backup.current(organizationId,allowedLocationIds),
      this.support.current(organizationId,allowedLocationIds),
      this.security.current(organizationId,allowedLocationIds),
      this.performance.current(organizationId,allowedLocationIds),
      this.continuity.current(organizationId,allowedLocationIds),
      this.enablement.current(organizationId,allowedLocationIds),
      this.pilotLaunchControlService.snapshot(organizationId,allowedLocationIds)
    ]);
    const launchById=new Map((launch.locations||[]).map(x=>[x.locationId,x]));
    const sources={environment,backup,support,security,performance,continuity,enablement};
    const ids=[...new Set(Object.values(sources).flatMap(x=>(x.locations||[]).map(y=>y.locationId)))];
    const locations=ids.map(locationId=>{
      const evidence=Object.entries(sources).map(([id,snap])=>{
        const row=(snap.locations||[]).find(x=>x.locationId===locationId);
        return {id,passed:row?row.ready===true:snap.ready===true,actual:row?.state||row?.status||(row?.ready===true?"READY":"OPEN")};
      });
      const launchLoc=launchById.get(locationId)||null;
      evidence.push({id:"launch-control",passed:launchLoc?.launchReady===true,actual:launchLoc?.launchState||"LAUNCH_CONTROL_REQUIRED"});
      const blockers=evidence.filter(x=>!x.passed).map(x=>x.id);
      return {
        locationId,locationName:launchLoc?.locationName||locationId,
        evidence,passed:evidence.length-blockers.length,total:evidence.length,
        blockers,goEligible:blockers.length===0,
        existingAuthorization:launchLoc?.authorization||null
      };
    });
    return {
      version:"94.75.0",
      gate:"PILOT_FINAL_GO_LIVE_CHECKLIST_AND_LAUNCH_AUTHORIZATION",
      generatedAt:new Date().toISOString(),
      decision:locations.length>0&&locations.every(x=>x.goEligible)?"GO_ELIGIBLE":"HOLD",
      goEligible:locations.length>0&&locations.every(x=>x.goEligible),
      locations,
      checklist:{
        environment:true,backupRestoreRollback:true,observabilitySupport:true,securityAccessAudit:true,
        performanceCapacityResilience:true,deviceNetworkContinuity:true,operatorEnablement:true,launchControl:true
      },
      safety:{
        assessmentDoesNotLaunch:true,
        explicitHumanLaunchAuthorizationRequired:true,
        authorizationDoesNotStartRuntime:true,
        automaticLaunch:false,automaticGoLive:false,automaticExpansion:false,
        autonomousProductionChanges:false
      },
      nextGate:"PILOT_LAUNCH_DAY_COMMAND_AND_CONTROL"
    };
  }
}
module.exports=PilotFinalGoLiveLaunchAuthorizationService;
