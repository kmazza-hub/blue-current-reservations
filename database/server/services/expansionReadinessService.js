"use strict";
class ExpansionReadinessService {
 constructor(database,auditService,realtimeHub,pilotDecisionLedgerService,executivePilotReviewService){Object.assign(this,{database,auditService,realtimeHub,pilotDecisionLedgerService,executivePilotReviewService});}
 now(){return new Date().toISOString();}
 async plans(org){const db=await this.database.read();return (db.expansionReadinessPlans||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));}
 async snapshot(org,allowed){
  const ledger=await this.pilotDecisionLedgerService.snapshot(org,allowed),review=await this.executivePilotReviewService.snapshot(org,allowed),latest=ledger.latestDecision,plans=await this.plans(org),active=plans[0]||null;
  const eligible=!!latest&&latest.decision==="EXPAND",scope=latest?.rolloutLocationIds||[],map=new Map((review.packet?.locationReview||[]).map(x=>[x.locationId,x]));
  const rollout=scope.map(id=>{const x=map.get(id)||{};return {locationId:id,locationName:x.locationName||id,owner:x.owner||"Unassigned",attentionLevel:x.attentionLevel||"unknown",targetsMet:x.targetsMet||0,targetsMeasured:x.targetsMeasured||0,readinessLift:x.readinessLift||0,rhythmLift:x.rhythmLift||0,leakageReductionPercent:x.leakageReductionPercent||0};});
  return {version:"48.25.0",generatedAt:this.now(),status:eligible?(active?"plan-drafted":"ready-to-plan"):"expansion-not-authorized",headline:eligible?`${scope.length} location(s) are within the signed human expansion scope. Drafting a rollout plan does not activate them.`:"A signed human EXPAND decision is required before rollout planning.",signedDecision:latest,rolloutScope:rollout,activePlan:active,planHistory:plans,policy:{signedExpandRequired:true,draftDoesNotActivate:true,automaticActivation:false,automaticExpansion:false,humanActivationRequired:true}};
 }
 async draft(org,allowed,input,actor){
  const snap=await this.snapshot(org,allowed);if(!snap.signedDecision||snap.signedDecision.decision!=="EXPAND")throw new Error("A signed human EXPAND decision is required before drafting rollout.");if(!snap.rolloutScope.length)throw new Error("The signed EXPAND decision has no rollout locations.");
  const waveSize=Math.max(1,Math.min(Number(input.waveSize)||1,snap.rolloutScope.length)),cadenceDays=Math.max(1,Math.min(Number(input.cadenceDays)||7,90)),readinessFloor=Math.max(0,Math.min(Number(input.readinessFloor)||70,100)),owner=String(input.owner||snap.signedDecision.approver||actor).trim().slice(0,160),conditions=String(input.conditions||snap.signedDecision.conditions||"").trim().slice(0,1500);
  const locations=snap.rolloutScope.map((x,i)=>({...x,wave:Math.floor(i/waveSize)+1,state:"PLANNED",activationApproved:false,activationApprovedBy:null,activationApprovedAt:null}));
  const record={id:`erp_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId:org,decisionId:snap.signedDecision.id,createdAt:this.now(),createdBy:actor,owner,conditions,cadenceDays,readinessFloor,waveSize,locations,status:"DRAFT",activationState:"NOT_ACTIVATED"};
  await this.database.mutate(db=>{db.expansionReadinessPlans||=[];db.expansionReadinessPlans.push(record);return record;});await this.auditService.record({organizationId:org,actor,action:`Expansion readiness plan drafted: ${record.id}; ${locations.length} location(s); activation NOT approved`,category:"pilot_value"});this.realtimeHub.publish("expansion-readiness:drafted",{id:record.id,organizationId:org,locations:locations.length});return record;
 }}
module.exports=ExpansionReadinessService;
