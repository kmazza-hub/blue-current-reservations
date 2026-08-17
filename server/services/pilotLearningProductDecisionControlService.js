"use strict";
class PilotLearningProductDecisionControlService {
  constructor(database,auditService,realtimeHub,valueProofService){
    Object.assign(this,{database,auditService,realtimeHub,valueProofService});
  }
  now(){return new Date().toISOString();}
  async decisions(org){
    const db=await this.database.read();
    return (db.pilotProductDecisions||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  }
  async snapshot(org,allowed){
    const [value,decisions]=await Promise.all([this.valueProofService.snapshot(org,allowed),this.decisions(org)]);
    const counts={FIX:0,SIMPLIFY:0,RETAIN:0,DEFER:0,EXPAND:0};
    decisions.forEach(x=>{if(counts[x.decision]!==undefined)counts[x.decision]++;});
    const unresolved=decisions.filter(x=>x.status!=="CLOSED");
    const highRiskOpen=unresolved.filter(x=>x.risk==="HIGH"||x.risk==="CRITICAL");
    const checks=[
      {id:"PILOT_VALUE_ACCEPTED",passed:value.valueProofReady===true,actual:value.status},
      {id:"PRODUCT_DECISION_EVIDENCE_LINKED",passed:decisions.length>0&&decisions.every(x=>x.evidenceRefs.length>0),actual:`${decisions.filter(x=>x.evidenceRefs.length>0).length}/${decisions.length} linked`},
      {id:"DECISION_OWNERSHIP_ASSIGNED",passed:decisions.length>0&&decisions.every(x=>!!x.owner),actual:`${decisions.filter(x=>!!x.owner).length}/${decisions.length} owned`},
      {id:"PRIORITY_ASSIGNED",passed:decisions.length>0&&decisions.every(x=>["P0","P1","P2","P3"].includes(x.priority)),actual:`${decisions.filter(x=>["P0","P1","P2","P3"].includes(x.priority)).length}/${decisions.length} prioritized`},
      {id:"HIGH_RISK_DECISIONS_RESOLVED",passed:highRiskOpen.length===0,actual:`${highRiskOpen.length} high/critical open`},
      {id:"HUMAN_PRODUCT_DECISION_PRESENT",passed:decisions.length>0,actual:`${decisions.length} decision(s)`}
    ];
    const ready=checks.every(x=>x.passed);
    return {version:"98.0.0",gate:"PILOT_LEARNING_TO_PRODUCT_DECISION_CONTROL",generatedAt:this.now(),
      productDecisionReady:ready,status:ready?"PILOT_LEARNING_CONTROLLED":"PILOT_LEARNING_DECISIONS_PENDING",
      checks,decisionCounts:counts,totalDecisions:decisions.length,openDecisions:unresolved.length,decisions,valueProof:value,
      policy:{allowedDecisions:["FIX","SIMPLIFY","RETAIN","DEFER","EXPAND"],evidenceLinkRequired:true,humanOwnerRequired:true,humanPriorityRequired:true,expansionDecisionIsNotExpansionAuthorization:true,noAutomaticBacklogMutation:true,noAutomaticProductChange:true,noAutomaticExpansion:true,noAutomaticCommercialization:true,autonomousProductionChanges:false},
      nextGate:"COMMERCIAL_PRODUCT_FREEZE_AND_FINAL_HARDENING"};
  }
  async record(org,allowed,input,actor){
    const value=await this.valueProofService.snapshot(org,allowed);
    if(!value.valueProofReady)throw new Error("Pilot value proof and operator acceptance must be complete before product decisions.");
    const decision=String(input.decision||"").toUpperCase(),allowedDecisions=["FIX","SIMPLIFY","RETAIN","DEFER","EXPAND"];
    if(!allowedDecisions.includes(decision))throw new Error("decision must be FIX, SIMPLIFY, RETAIN, DEFER, or EXPAND.");
    const priority=String(input.priority||"").toUpperCase();if(!["P0","P1","P2","P3"].includes(priority))throw new Error("priority must be P0, P1, P2, or P3.");
    const risk=String(input.risk||"MEDIUM").toUpperCase();if(!["LOW","MEDIUM","HIGH","CRITICAL"].includes(risk))throw new Error("risk must be LOW, MEDIUM, HIGH, or CRITICAL.");
    const owner=String(input.owner||"").trim(),rationale=String(input.rationale||"").trim();
    if(!owner||!rationale)throw new Error("owner and rationale are required.");
    const evidenceRefs=Array.isArray(input.evidenceRefs)?input.evidenceRefs.map(String).map(x=>x.trim()).filter(Boolean).slice(0,50):[];
    if(!evidenceRefs.length)throw new Error("At least one evidenceRef is required.");
    const rec={id:`ppd_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId:org,decision,priority,risk,owner:owner.slice(0,200),rationale:rationale.slice(0,6000),evidenceRefs,status:"OPEN",createdAt:this.now(),createdBy:actor,productChanged:false,expansionAuthorized:false,commercializationAuthorized:false};
    await this.database.mutate(db=>{db.pilotProductDecisions||=[];db.pilotProductDecisions.push(rec);return rec;});
    await this.auditService.record({organizationId:org,actor,action:`Pilot product decision ${decision} ${rec.id}`,category:"pilot_product_decision"});
    this.realtimeHub.publish("pilot:product-decision",{organizationId:org,id:rec.id,decision,priority,risk});return rec;
  }
  async close(org,id,input,actor){
    let rec=null;
    await this.database.mutate(db=>{
      rec=(db.pilotProductDecisions||[]).find(x=>x.organizationId===org&&x.id===id);
      if(!rec)throw new Error("Pilot product decision not found.");
      const evidence=String(input.closeoutEvidence||"").trim();if(!evidence)throw new Error("closeoutEvidence is required.");
      rec.status="CLOSED";rec.closeoutEvidence=evidence.slice(0,6000);rec.closedAt=this.now();rec.closedBy=actor;return rec;
    });
    await this.auditService.record({organizationId:org,actor,action:`Pilot product decision closed ${id}`,category:"pilot_product_decision"});
    this.realtimeHub.publish("pilot:product-decision-closed",{organizationId:org,id});return rec;
  }
}
module.exports=PilotLearningProductDecisionControlService;
