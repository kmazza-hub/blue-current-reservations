"use strict";

class RolloutActivationControlService {
  constructor(database,auditService,realtimeHub,expansionReadinessService,multiLocationPerformanceService){
    Object.assign(this,{database,auditService,realtimeHub,expansionReadinessService,multiLocationPerformanceService});
  }
  now(){return new Date().toISOString();}
  async approvals(organizationId){
    const db=await this.database.read();
    return (db.rolloutActivationApprovals||[]).filter(x=>x.organizationId===organizationId).sort((a,b)=>new Date(b.approvedAt)-new Date(a.approvedAt));
  }
  async snapshot(organizationId,allowedLocationIds){
    const [expansion,portfolio,approvals]=await Promise.all([
      this.expansionReadinessService.snapshot(organizationId,allowedLocationIds),
      this.multiLocationPerformanceService.snapshot(organizationId,allowedLocationIds),
      this.approvals(organizationId)
    ]);
    const plan=expansion.activePlan||null;
    const portfolioMap=new Map((portfolio.locations||[]).map(x=>[x.locationId,x]));
    const latestApprovalByLocation=new Map();
    for(const x of approvals)if(!latestApprovalByLocation.has(x.locationId))latestApprovalByLocation.set(x.locationId,x);
    const locations=(plan?.locations||[]).map(x=>{
      const live=portfolioMap.get(x.locationId)||{};
      const gates=[
        {id:"signed-scope",label:"Included in signed human EXPAND scope",passed:expansion.signedDecision?.decision==="EXPAND"&&(expansion.signedDecision?.rolloutLocationIds||[]).includes(x.locationId)},
        {id:"rollout-plan",label:"Included in current rollout plan",passed:true},
        {id:"readiness-floor",label:`Readiness at or above ${plan.readinessFloor}`,passed:Number(live.readinessScore||0)>=Number(plan.readinessFloor||0),actual:Number(live.readinessScore||0)},
        {id:"leadership-attention",label:"No High/Critical leadership attention state",passed:!["high","critical"].includes(live.attentionLevel),actual:live.attentionLevel||"unknown"},
        {id:"urgent-predictive",label:"No urgent predictive intervention requiring immediate leadership action",passed:Number(live.urgentPredictiveInterventions||0)===0,actual:Number(live.urgentPredictiveInterventions||0)}
      ];
      const passed=gates.filter(g=>g.passed).length,approval=latestApprovalByLocation.get(x.locationId)||null;
      return {
        locationId:x.locationId,locationName:x.locationName,wave:x.wave,planState:x.state,
        readinessScore:Number(live.readinessScore||0),attentionLevel:live.attentionLevel||"unknown",
        urgentPredictiveInterventions:Number(live.urgentPredictiveInterventions||0),
        gates,passed,total:gates.length,preflightPassed:passed===gates.length,
        approval,
        activationControlState:approval?.status==="APPROVED_FOR_ACTIVATION"?"APPROVED_NOT_DEPLOYED":"AWAITING_HUMAN_APPROVAL"
      };
    });
    return {
      version:"49.5.0",generatedAt:this.now(),
      status:!plan?"rollout-plan-required":locations.every(x=>x.approval?.status==="APPROVED_FOR_ACTIVATION")?"activation-approvals-complete":"activation-review-required",
      headline:!plan?"A signed expansion rollout plan is required before activation review.":`${locations.filter(x=>x.preflightPassed).length}/${locations.length} planned location(s) currently pass all live activation preflight gates.`,
      plan:plan?{id:plan.id,status:plan.status,activationState:plan.activationState,waveSize:plan.waveSize,cadenceDays:plan.cadenceDays,readinessFloor:plan.readinessFloor,owner:plan.owner}:null,
      locations,approvalHistory:approvals,
      policy:{
        explicitHumanApprovalRequired:true,
        adminApprovalRequired:true,
        overrideRequiresReason:true,
        approvalDoesNotDeploy:true,
        automaticApproval:false,
        automaticDeployment:false,
        automaticActivation:false
      }
    };
  }
  async approve(organizationId,allowedLocationIds,locationId,input,actor){
    const snapshot=await this.snapshot(organizationId,allowedLocationIds);
    if(!snapshot.plan)throw new Error("A rollout plan is required before activation approval.");
    const location=snapshot.locations.find(x=>x.locationId===locationId);
    if(!location)throw new Error("Location is not in the current signed rollout plan.");
    const overrideReason=String(input.overrideReason||"").trim().slice(0,1200);
    if(!location.preflightPassed&&!overrideReason)throw new Error("Activation preflight has open gates. A documented executive override reason is required.");
    const approver=String(input.approver||actor||"").trim().slice(0,160);
    if(!approver)throw new Error("Activation approver is required.");
    const now=this.now();
    const record={
      id:`raa_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      organizationId,planId:snapshot.plan.id,locationId,locationName:location.locationName,wave:location.wave,
      status:"APPROVED_FOR_ACTIVATION",
      deploymentState:"NOT_DEPLOYED",
      approver,approvedBy:actor,approvedAt:now,
      overrideUsed:!location.preflightPassed,overrideReason,
      preflightAtApproval:{passed:location.passed,total:location.total,gates:location.gates},
      note:String(input.note||"").slice(0,800)
    };
    await this.database.mutate(db=>{
      db.rolloutActivationApprovals||=[];
      db.rolloutActivationApprovals.push(record);
      const plan=(db.expansionReadinessPlans||[]).find(x=>x.id===snapshot.plan.id);
      const target=plan?.locations?.find(x=>x.locationId===locationId);
      if(target){
        target.activationApproved=true;
        target.activationApprovedBy=approver;
        target.activationApprovedAt=now;
        target.state="APPROVED_FOR_ACTIVATION";
      }
      return record;
    });
    await this.auditService.record({organizationId,actor,action:`Rollout activation approved for ${locationId} by ${approver}; deployment NOT performed${record.overrideUsed?" with executive override":""}`,category:"rollout_activation"});
    this.realtimeHub.publish("rollout-activation:approved",{id:record.id,organizationId,locationId,approver,overrideUsed:record.overrideUsed});
    return record;
  }
}
module.exports=RolloutActivationControlService;
