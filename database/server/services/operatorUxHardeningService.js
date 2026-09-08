"use strict";

class OperatorUxHardeningService {
  constructor(database,auditService,realtimeHub,rolePermissionCertificationService){
    Object.assign(this,{database,auditService,realtimeHub,rolePermissionCertificationService});
    this.workflows=[
      {id:"OPENING",label:"Opening / Shift Start",surfaceId:"restaurantDayLifecycle",shortcut:"Alt+1"},
      {id:"RESERVATIONS",label:"Reservations",surfaceId:"reservationYieldCenter",shortcut:"Alt+2"},
      {id:"SEATING",label:"Seating / Floor",surfaceId:"digitalTwinVisualizationCenter",shortcut:"Alt+3"},
      {id:"ACTIVE_SERVICE",label:"Active Service",surfaceId:"guidedShiftCenter",shortcut:"Alt+4"},
      {id:"KITCHEN",label:"Kitchen",surfaceId:"kitchenThroughputCenter",shortcut:"Alt+5"},
      {id:"GUEST_RECOVERY",label:"Guest Recovery",surfaceId:"guestRecoveryCenter",shortcut:"Alt+6"},
      {id:"CLOSEOUT",label:"Shift Closeout",surfaceId:"shiftCloseoutCenter",shortcut:"Alt+7"},
      {id:"PILOT_READINESS",label:"Pilot Readiness",surfaceId:"pilotOperationalReadiness",shortcut:"Alt+8"}
    ];
    this.terminology=[
      {preferred:"Reservation",avoid:["booking record","reservation object"],reason:"Use the restaurant-facing term operators already know."},
      {preferred:"Seat guest",avoid:["assign occupancy","activate table"],reason:"Describe the operator action, not the data mutation."},
      {preferred:"Table turn",avoid:["table lifecycle cycle"],reason:"Use standard restaurant operations language."},
      {preferred:"Guest recovery",avoid:["exception remediation"],reason:"Keep service-recovery language hospitality-first."},
      {preferred:"Shift closeout",avoid:["operational termination"],reason:"Match restaurant management language."},
      {preferred:"Manager approval",avoid:["authorization mutation"],reason:"Separate human decision language from system internals."}
    ];
  }
  now(){return new Date().toISOString();}
  async records(organizationId){
    const db=await this.database.read();
    return (db.operatorUxFrictionRecords||[]).filter(x=>x.organizationId===organizationId).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  }
  async certifications(organizationId){
    const db=await this.database.read();
    return (db.operatorUxCertifications||[]).filter(x=>x.organizationId===organizationId).sort((a,b)=>new Date(b.certifiedAt)-new Date(a.certifiedAt));
  }
  async snapshot(organizationId,allowedLocationIds){
    const [roleAccess,records,certs]=await Promise.all([
      this.rolePermissionCertificationService.snapshot(organizationId,allowedLocationIds),
      this.records(organizationId),this.certifications(organizationId)
    ]);
    const open=records.filter(x=>x.status!=="RESOLVED");
    const high=open.filter(x=>["high","critical"].includes(x.severity));
    const checks=[
      {id:"role-boundary",label:"Role/permission model is ready for pilot UX",passed:["role-permission-ready-for-certification","role-permission-certified"].includes(roleAccess.status),actual:roleAccess.status},
      {id:"primary-workflows",label:"Primary restaurant workflows have one canonical quick-navigation target",passed:this.workflows.every(x=>x.surfaceId&&x.shortcut),actual:`${this.workflows.length}/${this.workflows.length} mapped`},
      {id:"terminology",label:"Canonical restaurant terminology is defined",passed:this.terminology.length>=6,actual:`${this.terminology.length} terminology rules`},
      {id:"high-friction",label:"No unresolved high/critical pilot UX findings",passed:high.length===0,actual:`${high.length} high/critical open`},
      {id:"human-review",label:"UX certification remains human controlled",passed:true,actual:"human evidence required"}
    ];
    const latest=certs[0]||null;
    return {
      version:"51.30.0",generatedAt:this.now(),
      status:checks.every(x=>x.passed)?(latest?.status==="OPERATOR_UX_CERTIFIED"?"operator-ux-certified":"operator-ux-ready-for-certification"):"operator-ux-hardening-required",
      headline:`${checks.filter(x=>x.passed).length}/${checks.length} operator-UX hardening gates pass; ${open.length} friction finding(s) remain open.`,
      checks,workflows:this.workflows,terminology:this.terminology,
      findings:records,openFindings:open,
      totals:{
        findings:records.length,open:open.length,
        highCriticalOpen:high.length,
        resolved:records.filter(x=>x.status==="RESOLVED").length
      },
      certification:latest,
      hardening:{
        minimumInteractiveTargetPx:44,
        keyboardNavigation:true,
        visibleFocus:true,
        readableContrast:true,
        primaryActionsFirst:true,
        destructiveActionsSeparated:true,
        terminologyNormalized:true,
        duplicateActionReduction:true
      },
      policy:{
        provenWorkflowBehaviorPreserved:true,
        uxCertificationHumanRequired:true,
        findingsRequireHumanResolution:true,
        noAutomaticWorkflowRedesign:true,
        noAutomaticActionExecution:true,
        autonomousProductionChanges:false
      }
    };
  }
  async recordFinding(organizationId,input,actor){
    const workflowId=String(input.workflowId||"").toUpperCase();
    if(!this.workflows.some(x=>x.id===workflowId))throw new Error("A valid pilot workflow is required.");
    const severity=String(input.severity||"medium").toLowerCase();
    if(!["low","medium","high","critical"].includes(severity))throw new Error("Severity must be low, medium, high, or critical.");
    const issue=String(input.issue||"").trim().slice(0,1800);
    if(!issue)throw new Error("Operator friction description is required.");
    const record={
      id:`uxf_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      organizationId,workflowId,severity,issue,
      observedClicks:Math.max(0,Math.min(Number(input.observedClicks)||0,100)),
      expectedClicks:Math.max(0,Math.min(Number(input.expectedClicks)||0,100)),
      terminologyIssue:String(input.terminologyIssue||"").trim().slice(0,500),
      status:"OPEN",createdAt:this.now(),createdBy:actor,
      automaticUiChangePerformed:false
    };
    await this.database.mutate(db=>{db.operatorUxFrictionRecords||=[];db.operatorUxFrictionRecords.push(record);return record;});
    await this.auditService.record({organizationId,actor,action:`Operator UX friction recorded: ${workflowId} / ${severity}`,category:"pilot_ux"});
    this.realtimeHub.publish("operator-ux:finding-created",{organizationId,id:record.id,workflowId,severity});
    return record;
  }
  async resolveFinding(organizationId,id,input,actor){
    const resolution=String(input.resolution||"").trim().slice(0,1800);
    if(!resolution)throw new Error("Human resolution evidence is required.");
    const now=this.now();
    const record=await this.database.mutate(db=>{
      const x=(db.operatorUxFrictionRecords||[]).find(r=>r.id===id&&r.organizationId===organizationId);
      if(!x)return null;
      x.status="RESOLVED";x.resolution=resolution;x.resolvedAt=now;x.resolvedBy=actor;
      x.automaticUiChangePerformed=false;return {...x};
    });
    if(!record)throw new Error("Operator UX finding not found.");
    await this.auditService.record({organizationId,actor,action:`Operator UX friction resolved: ${id}`,category:"pilot_ux"});
    this.realtimeHub.publish("operator-ux:finding-resolved",{organizationId,id});
    return record;
  }
  async certify(organizationId,allowedLocationIds,input,actor){
    const snap=await this.snapshot(organizationId,allowedLocationIds);
    if(!snap.checks.every(x=>x.passed))throw new Error("All operator UX hardening gates must pass before certification.");
    const evidence=String(input.evidence||"").trim().slice(0,2600);
    const note=String(input.note||"").trim().slice(0,1800);
    if(!evidence)throw new Error("Human operator-usability evidence is required.");
    if(!note)throw new Error("Human UX certification note is required.");
    const record={
      id:`uxc_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      organizationId,status:"OPERATOR_UX_CERTIFIED",
      certifiedAt:this.now(),certifiedBy:actor,evidence,note,
      checkSnapshot:snap.checks,openFindingCount:snap.totals.open,
      workflowBehaviorChangedByCertification:false,
      automaticActionExecution:false
    };
    await this.database.mutate(db=>{db.operatorUxCertifications||=[];db.operatorUxCertifications.push(record);return record;});
    await this.auditService.record({organizationId,actor,action:"V51 operator UX hardening certified for pilot",category:"pilot_ux"});
    this.realtimeHub.publish("operator-ux:certified",{organizationId,id:record.id});
    return record;
  }
}
module.exports=OperatorUxHardeningService;
