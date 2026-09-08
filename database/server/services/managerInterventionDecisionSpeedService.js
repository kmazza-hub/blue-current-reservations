"use strict";
class ManagerInterventionDecisionSpeedService{
 constructor(database,auditService,realtimeHub,operatorSpeedWorkflowSimplificationService){Object.assign(this,{database,auditService,realtimeHub,operatorSpeedWorkflowSimplificationService});this.categories=["GUEST_RECOVERY","TABLE_DELAY","KITCHEN_DELAY","STAFFING","RESERVATION_EXCEPTION","SYSTEM_DEGRADED"];}
 now(){return new Date().toISOString();}
 async records(org){const db=await this.database.read();return (db.managerInterventionDecisionRecords||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.observedAt)-new Date(a.observedAt));}
 async certifications(org){const db=await this.database.read();return (db.managerInterventionDecisionCertifications||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.certifiedAt)-new Date(a.certifiedAt));}
 async snapshot(org,allowed){
  const [speed,records,certs]=await Promise.all([this.operatorSpeedWorkflowSimplificationService.snapshot(org,allowed),this.records(org),this.certifications(org)]);
  const locations=(speed.locations||[]).map(loc=>{const history=records.filter(x=>x.locationId===loc.locationId),latest=history[0]||null,cert=certs.find(x=>x.locationId===loc.locationId)||null;
   const avgDecision=latest?.scenarios?.length?latest.scenarios.reduce((n,x)=>n+Number(x.decisionSeconds||0),0)/latest.scenarios.length:0;
   const avgAcknowledge=latest?.scenarios?.length?latest.scenarios.reduce((n,x)=>n+Number(x.acknowledgeSeconds||0),0)/latest.scenarios.length:0;
   const highCritical=(latest?.findings||[]).filter(x=>x.status!=="RESOLVED"&&["high","critical"].includes(String(x.severity||"").toLowerCase()));
   const checks=[
    {id:"SERVICE_UX_READY",passed:loc.usabilityReady||loc.certification?.decision==="READY",actual:loc.state},
    {id:"ALL_EXCEPTION_CLASSES",passed:!!latest&&this.categories.every(id=>latest.scenarios.some(x=>x.category===id)),actual:`${latest?.scenarios?.length||0}/${this.categories.length}`},
    {id:"ACKNOWLEDGEMENT_SPEED",passed:!!latest&&avgAcknowledge<=Number(latest.thresholds.maxAcknowledgeSeconds),actual:latest?`${avgAcknowledge.toFixed(1)}s avg / ${latest.thresholds.maxAcknowledgeSeconds}s max`:"not observed"},
    {id:"DECISION_SPEED",passed:!!latest&&avgDecision<=Number(latest.thresholds.maxDecisionSeconds),actual:latest?`${avgDecision.toFixed(1)}s avg / ${latest.thresholds.maxDecisionSeconds}s max`:"not observed"},
    {id:"OWNER_CLARITY",passed:latest?.ownerClarity==="PASS",actual:latest?.ownerClarity||"not assessed"},
    {id:"NEXT_ACTION_CLARITY",passed:latest?.nextActionClarity==="PASS",actual:latest?.nextActionClarity||"not assessed"},
    {id:"ESCALATION_CLARITY",passed:latest?.escalationClarity==="PASS",actual:latest?.escalationClarity||"not assessed"},
    {id:"NO_HIGH_CRITICAL_DECISION_FRICTION",passed:highCritical.length===0,actual:`${highCritical.length} high/critical finding(s)`},
    {id:"HUMAN_MANAGER_CERTIFICATION",passed:!!cert,actual:cert?.decision||"not certified"}];
   return {locationId:loc.locationId,locationName:loc.locationName,latestObservation:latest,certification:cert,checks,passed:checks.filter(x=>x.passed).length,total:checks.length,decisionReady:checks.slice(0,-1).every(x=>x.passed),metrics:{averageAcknowledgeSeconds:Number(avgAcknowledge.toFixed(2)),averageDecisionSeconds:Number(avgDecision.toFixed(2))},state:cert?.decision==="READY"?"MANAGER_DECISION_READY":cert?.decision==="REVISE"?"MANAGER_DECISION_REVISE":cert?.decision==="HOLD"?"MANAGER_DECISION_HOLD":latest?"MANAGER_DECISION_OBSERVED":"MANAGER_DECISION_OBSERVATION_REQUIRED"};});
  return {version:"54.50.0",generatedAt:this.now(),status:locations.some(x=>x.certification?.decision==="READY")?"manager-intervention-ready":locations.some(x=>x.latestObservation)?"manager-intervention-in-review":"manager-intervention-observation-required",headline:`${locations.filter(x=>x.decisionReady).length}/${locations.length} location(s) satisfy manager intervention and decision-speed gates.`,locations,categories:this.categories,policy:{exceptionOwnershipRequired:true,acknowledgementSpeedRequired:true,decisionSpeedRequired:true,nextActionClarityRequired:true,escalationClarityRequired:true,humanReadyReviseHoldRequired:true,noAutomaticManagerDecision:true,noAutomaticGuestCompensation:true,noAutomaticRestaurantAction:true,autonomousProductionChanges:false}};
 }
 async observe(org,allowed,locationId,input,actor){
  const scenarios=(Array.isArray(input.scenarios)?input.scenarios:[]).map(x=>({category:String(x.category||"").toUpperCase(),acknowledgeSeconds:Math.max(0,Number(x.acknowledgeSeconds)||0),decisionSeconds:Math.max(0,Number(x.decisionSeconds)||0),owner:String(x.owner||"").trim().slice(0,300),nextAction:String(x.nextAction||"").trim().slice(0,700)}));
  if(this.categories.some(id=>!scenarios.some(x=>x.category===id)))throw new Error("All manager exception classes require observation.");
  for(const k of ["ownerClarity","nextActionClarity","escalationClarity"])if(!["PASS","FAIL"].includes(String(input[k]||"").toUpperCase()))throw new Error(`${k} must be PASS or FAIL.`);
  const evidence=String(input.evidence||"").trim();if(!evidence)throw new Error("Manager intervention evidence is required.");
  const record={id:`mid_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId:org,locationId,observedAt:this.now(),observedBy:actor,scenarios,thresholds:{maxAcknowledgeSeconds:Math.max(1,Number(input.maxAcknowledgeSeconds)||15),maxDecisionSeconds:Math.max(1,Number(input.maxDecisionSeconds)||60)},ownerClarity:String(input.ownerClarity).toUpperCase(),nextActionClarity:String(input.nextActionClarity).toUpperCase(),escalationClarity:String(input.escalationClarity).toUpperCase(),evidence:evidence.slice(0,4000),findings:Array.isArray(input.findings)?input.findings:[],note:String(input.note||"").trim().slice(0,2200),automaticManagerDecision:false,automaticGuestCompensation:false,restaurantActionExecuted:false};
  await this.database.mutate(db=>{db.managerInterventionDecisionRecords||=[];db.managerInterventionDecisionRecords.push(record);return record;});await this.auditService.record({organizationId:org,actor,action:`Manager intervention observation recorded for ${locationId}`,category:"manager_intervention"});return record;
 }
 async certify(org,allowed,locationId,input,actor){
  const state=await this.snapshot(org,allowed),loc=state.locations.find(x=>x.locationId===locationId);if(!loc?.latestObservation)throw new Error("Manager intervention observation required.");
  const decision=String(input.decision||"").toUpperCase(),evidence=String(input.evidence||"").trim(),reason=String(input.reason||"").trim();if(!["READY","REVISE","HOLD"].includes(decision))throw new Error("Decision must be READY, REVISE, or HOLD.");if(!evidence)throw new Error("Certification evidence required.");if(decision==="READY"&&!loc.decisionReady&&!reason)throw new Error("READY with open gates requires override reason.");if(["REVISE","HOLD"].includes(decision)&&!reason)throw new Error(`${decision} requires reason.`);
  const record={id:`midc_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId:org,locationId,decision,status:"MANAGER_INTERVENTION_CERTIFIED",certifiedAt:this.now(),certifiedBy:actor,evidence:evidence.slice(0,4000),reason:reason.slice(0,2200),gateSnapshot:loc.checks,managerDecisionExecutedByCertification:false,guestCompensationExecutedByCertification:false,restaurantActionExecutedByCertification:false,autonomousProductionChanges:false};
  await this.database.mutate(db=>{db.managerInterventionDecisionCertifications||=[];db.managerInterventionDecisionCertifications.push(record);return record;});return record;
 }}
module.exports=ManagerInterventionDecisionSpeedService;
