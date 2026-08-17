"use strict";

class PilotOperatorCommandCenterService{
  constructor(database,launchControl,runtime,observability,closeout,learning){
    this.database=database;this.launch=launchControl;this.runtime=runtime;
    this.observability=observability;this.closeout=closeout;this.learning=learning;
  }
  async safe(fn,fallback=null){try{return await fn();}catch{return fallback;}}
  roleProfile(role){
    const key=String(role||"MANAGER").toUpperCase();
    const profiles={
      HOST:{
        role:"HOST",label:"Host",
        primary:"GUEST_FLOW",
        priorities:["guestFlow","tableState","serviceAlerts"],
        primaryWorkspaces:["guests","service"],
        secondaryWorkspaces:["team"],
        showPilotControls:false,showEvidence:false,showIncidents:true,
        shiftFlow:"SERVICE_AWARENESS",
        guidance:"Keep guest flow, waits, and table readiness clear. Escalate operational exceptions to the manager."
      },
      MANAGER:{
        role:"MANAGER",label:"Manager",
        primary:"SERVICE_CONTROL",
        priorities:["nextAction","sessionHealth","incidents","readiness"],
        primaryWorkspaces:["service","guests","kitchen"],
        secondaryWorkspaces:["team","inventory","executive"],
        showPilotControls:true,showEvidence:true,showIncidents:true,
        shiftFlow:"TAKE_CONTROL_AND_HANDOFF",
        guidance:"Control the shift, resolve exceptions, and keep the pilot inside its approved operating envelope."
      },
      OPERATOR:{
        role:"OPERATOR",label:"Operator",
        primary:"PILOT_CONTROL",
        priorities:["readiness","sessionHealth","incidents","evidence"],
        primaryWorkspaces:["service","kitchen","guests"],
        secondaryWorkspaces:["team","inventory","executive"],
        showPilotControls:true,showEvidence:true,showIncidents:true,
        shiftFlow:"PILOT_CONTINUITY",
        guidance:"Protect pilot integrity, verify evidence continuity, and document every intervention."
      },
      EXECUTIVE:{
        role:"EXECUTIVE",label:"Executive",
        primary:"OUTCOME_OVERVIEW",
        priorities:["readiness","outcomes","evidence","exceptions"],
        primaryWorkspaces:["executive"],
        secondaryWorkspaces:[],
        showPilotControls:false,showEvidence:true,showIncidents:false,
        shiftFlow:"OUTCOME_REVIEW",
        guidance:"Review readiness, outcomes, exceptions, and learning without entering service-level controls."
      }
    };
    return profiles[key]||profiles.MANAGER;
  }
  async current(organizationId,role="MANAGER"){
    const [launch,runtime,closeouts,decisions]=await Promise.all([
      this.safe(()=>this.launch.current(organizationId),null),
      this.safe(()=>this.runtime.current(organizationId),null),
      this.safe(()=>this.closeout.portfolio(organizationId),{closedSessions:0,closeouts:[]}),
      this.safe(()=>this.learning.portfolio(organizationId),{decisions:0,history:[]})
    ]);
    const active=runtime?.activeSession||null;
    const obs=active?await this.safe(()=>this.observability.timeline(organizationId,active.id),null):null;
    const latestCloseout=closeouts?.closeouts?.[0]||null;
    const latestDecision=decisions?.history?.[0]||null;

    let status="SETUP_REQUIRED",nextAction="Complete restaurant configuration and pilot readiness gates.",tone="hold";
    if(launch?.hold){status="LAUNCH_HOLD";nextAction="Review and release the explicit pilot launch hold when conditions are ready.";tone="hold";}
    else if(active){
      const critical=Number(obs?.summary?.criticalOpen||0),open=Number(obs?.summary?.openIncidents||0);
      status=active.state==="PAUSED"?"PILOT_PAUSED":critical?"CRITICAL_INCIDENT":open?"PILOT_DEGRADED":"PILOT_ACTIVE";
      nextAction=active.state==="PAUSED"?"Review the pause reason and operating envelope before resuming.":critical?"Resolve the critical incident before service continues.":open?"Acknowledge and resolve open pilot incidents.":"Continue the controlled session and monitor service health.";
      tone=critical||active.state==="PAUSED"?"hold":open?"watch":"go";
    }else if(launch?.current){
      status="READY_TO_START";nextAction="Human approval is current. Start the controlled pilot session when the operator is ready.";tone="go";
    }else if(latestCloseout&&!latestDecision){
      status="LEARNING_DECISION_REQUIRED";nextAction="Review the completed session evidence and record REPEAT, HOLD, REVISE, or PROGRESS.";tone="watch";
    }else if(latestDecision){
      status=`DECIDED_${latestDecision.decision}`;
      nextAction=latestDecision.decision==="REVISE"?"Apply required changes and recertify before another session.":latestDecision.decision==="HOLD"?"Resolve the hold before further pilot activity.":latestDecision.decision==="REPEAT"?"Prepare a new controlled session against current certified evidence.":"Prepare the next controlled pilot stage; no automatic expansion is authorized.";
      tone=latestDecision.decision==="PROGRESS"?"go":latestDecision.decision==="HOLD"?"hold":"watch";
    }else if(launch?.assessment?.decision==="GO_ELIGIBLE"){
      status="HUMAN_APPROVAL_REQUIRED";nextAction="Review the readiness evidence and explicitly approve or hold pilot launch.";tone="watch";
    }else if(launch){
      status="READINESS_HOLD";nextAction="Complete the remaining readiness gates before launch approval.";tone="hold";
    }

    const presentation=this.roleProfile(role);
    return {
      version:"95.75.0",phase:"D",organizationId,
      surface:"OPERATOR_PILOT_COMMAND_CENTER",
      presentation,
      status,tone,nextAction,
      readiness:{
        decision:launch?.assessment?.decision||"UNKNOWN",
        currentApproval:Boolean(launch?.current),
        explicitHold:Boolean(launch?.hold),
        blocking:launch?.assessment?.blocking||[]
      },
      session:active?{id:active.id,label:active.label,state:active.state,startedAt:active.startedAt}:null,
      health:active?{
        state:Number(obs?.summary?.criticalOpen||0)>0?"CRITICAL":Number(obs?.summary?.openIncidents||0)>0?"DEGRADED":"HEALTHY",
        openIncidents:Number(obs?.summary?.openIncidents||0),
        criticalOpen:Number(obs?.summary?.criticalOpen||0),
        metrics:Number(obs?.summary?.metrics||0),
        incidents:(obs?.incidents||[]).filter(x=>x.status!=="RESOLVED").map(x=>({id:x.id,title:x.title,severity:x.severity,status:x.status,description:x.description||null})),
        recovery:{workflow:["DETECT","OWN","RECOVER","VERIFY"],verificationRequiredBeforeResolve:true,humanControlled:true}
      }:null,
      evidence:{
        closedSessions:Number(closeouts?.closedSessions||0),learningDecisions:Number(decisions?.decisions||0),
        latestOutcome:latestCloseout?.outcome||null,latestDecision:latestDecision?.decision||null,
        postShiftReview:latestCloseout?{
          sessionId:latestCloseout.sessionId||null,
          outcome:latestCloseout.outcome||null,
          operatorSummary:latestCloseout.operatorSummary||null,
          lessonsLearned:latestCloseout.lessonsLearned||null,
          followUp:latestCloseout.followUp||null,
          closedAt:latestCloseout.closedAt||null,
          incidentCount:Number(latestCloseout.evidence?.runtimeSummary?.incidents||latestCloseout.evidence?.incidents?.length||0),
          resolvedIncidentCount:(latestCloseout.evidence?.incidents||[]).filter(x=>x.status==="RESOLVED").length,
          recoveryEvidence:(latestCloseout.evidence?.incidents||[]).filter(x=>x.status==="RESOLVED").slice(-5).map(x=>({
            id:x.id,title:x.title,severity:x.severity,
            acknowledgedAt:x.acknowledgedAt||null,escalatedAt:x.escalatedAt||null,resolvedAt:x.resolvedAt||null,
            resolution:x.resolution||null,resolvedBy:x.resolvedBy||null
          }))
        }:null
      },
      controls:{
        canStart:Boolean(!active&&launch?.current&&!launch?.hold),
        canPause:Boolean(active?.state==="ACTIVE"),
        canResume:Boolean(active?.state==="PAUSED"),
        canStop:Boolean(active&&["ACTIVE","PAUSED"].includes(active.state)),
        sessionId:active?.id||null,
        primaryAction:active?.state==="ACTIVE"?"MONITOR":active?.state==="PAUSED"?"RESUME":(!active&&launch?.current&&!launch?.hold)?"START":"REVIEW",
        dangerousActions:["STOP"],
        reasonRequired:["PAUSE","STOP"]
      },
      fieldAcceptance:{primaryActionVisible:true,exceptionRecoveryVisible:true,minimumTouchTargetPx:44,duplicateControlSubmissionProtected:true,secondaryToolsProgressivelyDisclosed:true,keyboardRefreshShortcut:"R"},
      fieldRehearsal:{sequence:["OPENING","SHIFT_START","NORMAL_SERVICE","PRESSURE_EVENT","EXCEPTION_RECOVERY","HANDOFF","CLOSEOUT"],allStagesRequired:true,criticalFailureBlocksAcceptance:true,humanSignoffRequired:true,productionWriteBackRequired:false,automaticPilotLaunch:false},
      deploymentReadiness:{gate:"PILOT_ENVIRONMENT_AND_DEPLOYMENT_READINESS",liveEvidenceEndpoint:"/api/pilot/environment-readiness",humanDeploymentApprovalRequired:true,automaticDeployment:false},
      recoveryReadiness:{gate:"PILOT_BACKUP_RESTORE_AND_ROLLBACK_READINESS",liveEvidenceEndpoint:"/api/pilot/recovery-readiness",checkpointEndpoint:"/api/pilot/recovery-readiness/checkpoint",humanRollbackApprovalRequired:true,automaticRollback:false},
      supportReadiness:{gate:"PILOT_OBSERVABILITY_ALERTING_AND_SUPPORT_READINESS",liveEvidenceEndpoint:"/api/pilot/support-readiness",criticalIncidentPauseGuard:true,humanSupportOwnershipRequired:true,automaticRemediation:false},
      securityReadiness:{gate:"PILOT_SECURITY_ACCESS_AND_AUDIT_READINESS",liveEvidenceEndpoint:"/api/pilot/security-readiness",apiAuthorizationBoundary:true,leastPrivilegeRequired:true,humanRoleCertificationRequired:true,autonomousPermissionChanges:false},
      performanceReadiness:{gate:"PILOT_PERFORMANCE_CAPACITY_AND_RESILIENCE_READINESS",liveEvidenceEndpoint:"/api/pilot/performance-readiness",peakStressEvidenceRequired:true,humanPeakObservationRequired:true,noAutomaticOperationalMutation:true},
      onsiteContinuityReadiness:{gate:"PILOT_DEVICE_NETWORK_AND_ONSITE_CONTINUITY_READINESS",liveEvidenceEndpoint:"/api/pilot/onsite-continuity-readiness",offlineContinuityRequired:true,reconnectReconciliationRequired:true,fallbackRunbookRequired:true,automaticRepair:false},
      operatorEnablementReadiness:{gate:"PILOT_TRAINING_RUNBOOK_AND_OPERATOR_ENABLEMENT_READINESS",liveEvidenceEndpoint:"/api/pilot/operator-enablement-readiness",humanOperatorAcceptanceRequired:true,humanManagerAcceptanceRequired:true,trainingDoesNotGrantPermissions:true},
      finalGoLiveReadiness:{gate:"PILOT_FINAL_GO_LIVE_CHECKLIST_AND_LAUNCH_AUTHORIZATION",liveEvidenceEndpoint:"/api/pilot/final-go-live-readiness",allReadinessGatesRequired:true,explicitHumanLaunchAuthorizationRequired:true,automaticLaunch:false},
      launchDayCommand:{gate:"PILOT_LAUNCH_DAY_COMMAND_AND_CONTROL",liveEvidenceEndpoint:"/api/pilot/launch-day-command",humanGoHold:true,criticalIncidentPauseGuard:true,localFallbackVisible:true,humanCloseout:true},
      firstServiceHypercare:{gate:"PILOT_FIRST_SERVICE_STABILIZATION_AND_HYPERCARE",liveEvidenceEndpoint:"/api/pilot/first-service-hypercare",humanNextServiceDecisionRequired:true,repeatedHealthRequired:true,unresolvedDebtVisible:true,noAutomaticNextService:true},
      repeatServiceConfidence:{gate:"PILOT_REPEAT_SERVICE_RELIABILITY_AND_CONFIDENCE",liveEvidenceEndpoint:"/api/pilot/repeat-service-confidence",multipleServicesRequired:true,humanLearningDecisionPerSession:true,noAutomaticExpansion:true},
      v96CertificationPreparation:{gate:"PILOT_EXIT_READINESS_AND_V96_CERTIFICATION_PREPARATION",liveEvidenceEndpoint:"/api/pilot/v96-certification-preparation",humanV96CertificationRequired:true,preparationDoesNotCertifyV96:true,noAutomaticExpansion:true},
      operatorBoundary:{
        humanApprovalRequired:true,humanSessionStartRequired:true,humanLearningDecisionRequired:true,
        providerWriteBack:false,automaticExpansion:false,autonomousProductionChanges:false
      }
    };
  }
}
module.exports=PilotOperatorCommandCenterService;
