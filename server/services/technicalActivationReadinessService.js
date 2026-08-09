"use strict";

class TechnicalActivationReadinessService {
  constructor(database,auditService,realtimeHub,rolloutActivationControlService){
    Object.assign(this,{database,auditService,realtimeHub,rolloutActivationControlService});
  }
  now(){return new Date().toISOString();}
  async authorizations(organizationId){
    const db=await this.database.read();
    return (db.technicalGoLiveAuthorizations||[])
      .filter(x=>x.organizationId===organizationId)
      .sort((a,b)=>new Date(b.authorizedAt)-new Date(a.authorizedAt));
  }
  async snapshot(organizationId,allowedLocationIds){
    const [db,activation,authorizations]=await Promise.all([
      this.database.read(),
      this.rolloutActivationControlService.snapshot(organizationId,allowedLocationIds),
      this.authorizations(organizationId)
    ]);
    const connectors=(db.liveConnectors||[]).filter(x=>x.organizationId===organizationId);
    const users=(db.users||[]).filter(x=>x.organizationId===organizationId&&x.status==="active");
    const memberships=(db.memberships||[]).filter(x=>x.organizationId===organizationId);
    const latestAuth=new Map();
    for(const x of authorizations)if(!latestAuth.has(x.locationId))latestAuth.set(x.locationId,x);

    const locations=(activation.locations||[]).map(loc=>{
      const locationId=loc.locationId;
      const configuration=(db.configurations||[]).find(x=>x.locationId===locationId)||null;
      const tables=(db.tables||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId);
      const sections=(db.sections||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId);
      const reservations=(db.reservations||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId);
      const staff=(db.staff||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId&&x.status==="active");
      const employees=(db.employees||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId&&x.status==="active");
      const kitchenStations=(db.kitchenStations||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId);
      const memberUsers=memberships.filter(m=>(m.locationIds||[]).includes("*")||(m.locationIds||[]).includes(locationId));
      const roleUsers=memberUsers.map(m=>users.find(u=>u.id===m.userId)).filter(Boolean);
      const connectedTypes=new Set(connectors.filter(x=>["connected","active","ready"].includes(String(x.status||"").toLowerCase())).map(x=>x.type));
      const configuredTypes=new Set(connectors.filter(x=>x.status!=="not-configured").map(x=>x.type));

      const checks=[
        {id:"activation-approval",category:"governance",label:"Human activation approval recorded",required:true,passed:loc.approval?.status==="APPROVED_FOR_ACTIVATION",actual:loc.activationControlState},
        {id:"location-config",category:"configuration",label:"Location operating configuration exists",required:true,passed:!!configuration,actual:configuration?.id||"missing"},
        {id:"auth-users",category:"identity",label:"At least one authorized user can access this location",required:true,passed:roleUsers.length>0,actual:roleUsers.length},
        {id:"floor-model",category:"floor",label:"Floor/table model is configured",required:true,passed:tables.length>0&&sections.length>0,actual:`${tables.length} tables · ${sections.length} sections`},
        {id:"reservation-model",category:"reservations",label:"Reservation data path has a configured operating model",required:true,passed:reservations.length>0||configuredTypes.has("reservations"),actual:`${reservations.length} local reservations · connector ${configuredTypes.has("reservations")?"configured":"not configured"}`},
        {id:"kitchen-model",category:"kitchen",label:"Kitchen operating model or connector is configured",required:true,passed:kitchenStations.length>0||configuredTypes.has("kitchen"),actual:`${kitchenStations.length} stations · connector ${configuredTypes.has("kitchen")?"configured":"not configured"}`},
        {id:"workforce-model",category:"workforce",label:"Workforce roster or labor connector is configured",required:true,passed:(staff.length+employees.length)>0||configuredTypes.has("labor"),actual:`${staff.length+employees.length} active people · connector ${configuredTypes.has("labor")?"configured":"not configured"}`},
        {id:"external-connectivity",category:"integrations",label:"At least one production-capable external connector is connected",required:false,passed:connectedTypes.size>0,actual:connectedTypes.size?Array.from(connectedTypes).join(", "):"none connected"},
        {id:"preflight",category:"operations",label:"V49 rollout activation preflight passed or was explicitly overridden",required:true,passed:loc.preflightPassed||loc.approval?.overrideUsed===true,actual:loc.preflightPassed?"passed":loc.approval?.overrideUsed?"executive override":"open"}
      ];
      const required=checks.filter(x=>x.required),passed=required.filter(x=>x.passed).length;
      const blockers=required.filter(x=>!x.passed).map(x=>({id:x.id,category:x.category,label:x.label,actual:x.actual}));
      const warningChecks=checks.filter(x=>!x.required&&!x.passed);
      const authorization=latestAuth.get(locationId)||null;
      return {
        locationId,locationName:loc.locationName,wave:loc.wave,
        requiredPassed:passed,requiredTotal:required.length,
        technicalReadinessPercent:required.length?Math.round(passed/required.length*100):0,
        technicallyReady:passed===required.length,
        checks,blockers,warnings:warningChecks,
        goLiveAuthorization:authorization,
        goLiveState:authorization?.status==="AUTHORIZED_FOR_GO_LIVE"?"AUTHORIZED_NOT_CUT_OVER":"NOT_AUTHORIZED",
        productionCutoverState:"NOT_PERFORMED"
      };
    });

    return {
      version:"49.10.0",generatedAt:this.now(),
      status:!activation.plan?"activation-plan-required":locations.length&&locations.every(x=>x.technicallyReady)?"technical-readiness-complete":"technical-readiness-review",
      headline:!activation.plan?"Rollout activation plan is required before technical readiness review.":`${locations.filter(x=>x.technicallyReady).length}/${locations.length} rollout location(s) currently satisfy all required technical readiness checks.`,
      activationPlan:activation.plan,
      locations,
      blockerCount:locations.reduce((s,x)=>s+x.blockers.length,0),
      warningCount:locations.reduce((s,x)=>s+x.warnings.length,0),
      authorizationHistory:authorizations,
      policy:{
        technicalReadinessDoesNotCutOver:true,
        humanGoLiveAuthorizationRequired:true,
        adminAuthorizationRequired:true,
        blockerOverrideRequiresReason:true,
        authorizationDoesNotDeploy:true,
        automaticProvisioning:false,
        automaticCutover:false,
        automaticGoLive:false
      }
    };
  }

  async authorize(organizationId,allowedLocationIds,locationId,input,actor){
    const snapshot=await this.snapshot(organizationId,allowedLocationIds);
    const loc=snapshot.locations.find(x=>x.locationId===locationId);
    if(!loc)throw new Error("Location is not in the current rollout activation plan.");
    const approver=String(input.approver||actor||"").trim().slice(0,160);
    if(!approver)throw new Error("Go-live approver is required.");
    const overrideReason=String(input.overrideReason||"").trim().slice(0,1500);
    if(!loc.technicallyReady&&!overrideReason)throw new Error("Technical readiness has open blockers. A documented executive override reason is required.");
    const now=this.now();
    const record={
      id:`tgl_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      organizationId,locationId,locationName:loc.locationName,wave:loc.wave,
      status:"AUTHORIZED_FOR_GO_LIVE",
      productionCutoverState:"NOT_PERFORMED",
      approver,authorizedBy:actor,authorizedAt:now,
      overrideUsed:!loc.technicallyReady,overrideReason,
      technicalReadinessAtAuthorization:{
        percent:loc.technicalReadinessPercent,
        requiredPassed:loc.requiredPassed,
        requiredTotal:loc.requiredTotal,
        blockers:loc.blockers,
        checks:loc.checks
      },
      launchWindow:String(input.launchWindow||"").slice(0,160),
      rollbackOwner:String(input.rollbackOwner||"").slice(0,160),
      note:String(input.note||"").slice(0,1000)
    };
    await this.database.mutate(db=>{
      db.technicalGoLiveAuthorizations||=[];
      db.technicalGoLiveAuthorizations.push(record);
      return record;
    });
    await this.auditService.record({organizationId,actor,action:`Technical go-live authorized for ${locationId} by ${approver}; production cutover NOT performed${record.overrideUsed?" with documented override":""}`,category:"technical_activation"});
    this.realtimeHub.publish("technical-activation:authorized",{id:record.id,organizationId,locationId,approver,overrideUsed:record.overrideUsed});
    return record;
  }

  packet(snapshot,locationId){
    const loc=snapshot.locations.find(x=>x.locationId===locationId);
    if(!loc)throw new Error("Location is not in technical activation review.");
    return {
      version:"49.10.0",
      generatedAt:this.now(),
      locationId:loc.locationId,
      locationName:loc.locationName,
      wave:loc.wave,
      readiness:`${loc.requiredPassed}/${loc.requiredTotal}`,
      technicalReadinessPercent:loc.technicalReadinessPercent,
      technicallyReady:loc.technicallyReady,
      blockers:loc.blockers,
      warnings:loc.warnings,
      checks:loc.checks,
      goLiveState:loc.goLiveState,
      productionCutoverState:"NOT_PERFORMED",
      policy:snapshot.policy
    };
  }
}
module.exports=TechnicalActivationReadinessService;
