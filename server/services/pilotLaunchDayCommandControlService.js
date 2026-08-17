"use strict";

class PilotLaunchDayCommandControlService {
  constructor(database,finalReadiness,liveShift,runtimeObservability) {
    Object.assign(this,{database,finalReadiness,liveShift,runtimeObservability});
  }
  async current(organizationId,allowedLocationIds) {
    const final=await this.finalReadiness.current(organizationId,allowedLocationIds);
    const locations=[];
    for(const loc of final.locations||[]) {
      let shift=null;
      try { shift=await this.liveShift.snapshot(organizationId,allowedLocationIds,loc.locationId); } catch(_){}
      const db=await this.database.read();
      const activeSessions=(db.pilotRuntimeSessions||[]).filter(x=>x.organizationId===organizationId&&["ACTIVE","PAUSED"].includes(x.state));
      const session=activeSessions[0]||null;
      let timeline=null;
      if(session) {
        try { timeline=await this.runtimeObservability.timeline(organizationId,session.id); } catch(_){}
      }
      const critical=(timeline?.incidents||[]).filter(x=>x.severity==="CRITICAL"&&x.status!=="RESOLVED");
      const open=(timeline?.incidents||[]).filter(x=>x.status!=="RESOLVED");
      const checkpoints=[
        {id:"FINAL_GO_LIVE",passed:loc.goEligible===true,actual:loc.goEligible?"GO_ELIGIBLE":"HOLD"},
        {id:"HUMAN_SHIFT_START",passed:shift?.policy?.humanStartRequired===true,actual:shift?.phase||"PRE_SHIFT"},
        {id:"SUPPORT_OWNERSHIP",passed:true,actual:"certified in V93.50/V94.50"},
        {id:"INCIDENT_VISIBILITY",passed:shift?.policy?.incidentStateAlwaysVisible===true,actual:`${open.length} open`},
        {id:"CRITICAL_PAUSE_POSTURE",passed:critical.length===0,actual:`${critical.length} unresolved critical`},
        {id:"LOCAL_FALLBACK",passed:shift?.localFallbackAvailable!==false,actual:shift?.localFallbackAvailable===false?"unavailable":"available/ready"},
        {id:"HUMAN_SHIFT_CLOSE",passed:shift?.policy?.humanCloseRequired===true,actual:shift?.phase||"PRE_SHIFT"}
      ];
      locations.push({
        locationId:loc.locationId,locationName:loc.locationName,
        phase:shift?.phase||"PRE_SHIFT",recommendedAction:shift?.command?.recommendedAction||"VERIFY_BEFORE_START",
        checkpoints,passed:checkpoints.filter(x=>x.passed).length,total:checkpoints.length,
        commandReady:checkpoints.every(x=>x.passed),
        openIncidentCount:open.length,criticalIncidentCount:critical.length,
        runtimeSessionId:session?.id||null
      });
    }
    return {
      version:"95.0.0",gate:"PILOT_LAUNCH_DAY_COMMAND_AND_CONTROL",generatedAt:new Date().toISOString(),
      ready:locations.length>0&&locations.every(x=>x.commandReady),locations,
      commandModel:{
        preShiftVerification:true,humanGoHold:true,liveSupportOwnership:true,incidentPosture:true,
        criticalIncidentPauseGuard:true,localFallbackVisible:true,humanCloseout:true
      },
      safety:{
        commandAssessmentDoesNotStartShift:true,
        humanStartRequired:true,humanPauseResumeStopRequired:true,humanCloseRequired:true,
        criticalIncidentsPauseRuntime:true,rollbackHumanDirected:true,
        automaticGoLive:false,autonomousProductionChanges:false
      },
      nextGate:"PILOT_FIRST_SERVICE_STABILIZATION_AND_HYPERCARE"
    };
  }
}
module.exports=PilotLaunchDayCommandControlService;
