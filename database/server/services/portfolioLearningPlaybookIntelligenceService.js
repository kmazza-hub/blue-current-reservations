"use strict";

class PortfolioLearningPlaybookIntelligenceService{
  constructor(database,outcomeIntelligenceService){
    this.database=database;
    this.outcomes=outcomeIntelligenceService;
  }
  now(){return new Date().toISOString();}

  async build(organizationId,allowedLocationIds=[]){
    const intelligence=await this.outcomes.build(organizationId,allowedLocationIds);
    const db=await this.database.read();
    const decisions=(db.portfolioDecisionLedger||[]).filter(x=>x.organizationId===organizationId&&x.status==="REVIEWED"&&x.outcomeRating);

    const groups=new Map();
    for(const d of decisions){
      const key=`${d.reason||"UNKNOWN"}::${d.decisionType||"UNKNOWN"}`;
      if(!groups.has(key,[])) groups.set(key,[]);
      groups.get(key).push(d);
    }

    const candidates=[...groups.entries()].map(([key,rows])=>{
      const [reason,decisionType]=key.split("::");
      const effective=rows.filter(x=>x.outcomeRating==="EFFECTIVE").length;
      const partial=rows.filter(x=>x.outcomeRating==="PARTIAL").length;
      const ineffective=rows.filter(x=>x.outcomeRating==="INEFFECTIVE").length;
      const locations=[...new Set(rows.map(x=>x.locationId).filter(Boolean))];
      const score=Math.round(((effective+(partial*.5))/rows.length)*100);
      const evidenceLevel=rows.length>=5&&locations.length>=2?"STRONG":rows.length>=3?"DEVELOPING":"EARLY";
      const recommendation=evidenceLevel==="STRONG"&&score>=75
        ?"PLAYBOOK_CANDIDATE"
        : evidenceLevel!=="EARLY"&&score>=60
          ?"CONTINUE_LEARNING"
          :"INSUFFICIENT_EVIDENCE";
      return {
        id:`learning-${reason.toLowerCase().replace(/[^a-z0-9]+/g,"-")}-${decisionType.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`,
        reason,decisionType,
        reviewedDecisions:rows.length,
        representedLocations:locations.length,
        effective,partial,ineffective,
        effectivenessScore:score,
        evidenceLevel,
        recommendation,
        supportingDecisionIds:rows.map(x=>x.id),
        lesson:`${decisionType} has a ${score}% observed outcome score across ${rows.length} reviewed decision${rows.length===1?"":"s"} for ${reason}.`
      };
    }).sort((a,b)=>{
      const rank={PLAYBOOK_CANDIDATE:3,CONTINUE_LEARNING:2,INSUFFICIENT_EVIDENCE:1};
      return (rank[b.recommendation]-rank[a.recommendation])||(b.effectivenessScore-a.effectivenessScore);
    });

    const stored=(db.portfolioOperatingPlaybooks||[]).filter(x=>x.organizationId===organizationId);
    return {
      version:"84.0.0",
      generatedAt:this.now(),
      organizationId,
      summary:{
        reviewedDecisions:decisions.length,
        learningPatterns:candidates.length,
        playbookCandidates:candidates.filter(x=>x.recommendation==="PLAYBOOK_CANDIDATE").length,
        developingPatterns:candidates.filter(x=>x.recommendation==="CONTINUE_LEARNING").length,
        approvedPlaybooks:stored.filter(x=>x.status==="APPROVED").length,
        retiredPlaybooks:stored.filter(x=>x.status==="RETIRED").length
      },
      learningPatterns:candidates,
      playbooks:stored.sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt)),
      systemicPatterns:intelligence.systemicPatterns||[],
      policy:{
        observedHistoryIsNotInstruction:true,
        humanApprovalRequiredToCreatePlaybook:true,
        humanApprovalRequiredToActivatePlaybook:true,
        noAutomaticOperationalExecution:true,
        noAutomaticCrossLocationRollout:true,
        localContextReviewRequired:true,
        autonomousProductionChanges:false
      }
    };
  }

  async createDraft(organizationId,allowedLocationIds=[],input={},actor){
    const intelligence=await this.build(organizationId,allowedLocationIds);
    const candidate=intelligence.learningPatterns.find(x=>x.id===input.learningPatternId);
    if(!candidate){const e=new Error("Learning pattern not found.");e.statusCode=404;throw e;}
    if(candidate.recommendation==="INSUFFICIENT_EVIDENCE"){
      const e=new Error("Insufficient evidence to create an operating playbook draft.");e.statusCode=409;throw e;
    }
    const title=String(input.title||`${candidate.reason}: ${candidate.decisionType}`).trim().slice(0,180);
    const guidance=String(input.guidance||"").trim().slice(0,4000);
    if(guidance.length<20){const e=new Error("Playbook draft requires human-authored guidance.");e.statusCode=400;throw e;}

    const now=this.now();
    const record={
      id:`pop-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      organizationId,
      learningPatternId:candidate.id,
      title,
      reason:candidate.reason,
      decisionType:candidate.decisionType,
      guidance,
      evidenceSnapshot:{
        reviewedDecisions:candidate.reviewedDecisions,
        representedLocations:candidate.representedLocations,
        effectivenessScore:candidate.effectivenessScore,
        evidenceLevel:candidate.evidenceLevel,
        supportingDecisionIds:candidate.supportingDecisionIds
      },
      status:"DRAFT",
      createdAt:now,createdBy:actor||"executive",
      updatedAt:now,updatedBy:actor||"executive",
      approvedAt:null,approvedBy:null,
      retiredAt:null,retiredBy:null,
      operationalExecutionAuthorized:false,
      automaticRolloutAuthorized:false
    };
    await this.database.mutate(db=>{
      db.portfolioOperatingPlaybooks=db.portfolioOperatingPlaybooks||[];
      db.portfolioOperatingPlaybooks.push(record);
      return true;
    });
    return record;
  }

  async approve(organizationId,playbookId,input={},actor){
    let result=null;
    await this.database.mutate(db=>{
      const row=(db.portfolioOperatingPlaybooks||[]).find(x=>x.organizationId===organizationId&&x.id===playbookId);
      if(!row){const e=new Error("Operating playbook not found.");e.statusCode=404;throw e;}
      if(row.status==="RETIRED"){const e=new Error("Retired playbooks cannot be approved.");e.statusCode=409;throw e;}
      const note=String(input.approvalNote||"").trim().slice(0,2000);
      if(note.length<10){const e=new Error("Human approval note is required.");e.statusCode=400;throw e;}
      row.status="APPROVED";row.approvalNote=note;row.approvedAt=this.now();row.approvedBy=actor||"executive";
      row.updatedAt=row.approvedAt;row.updatedBy=row.approvedBy;
      row.operationalExecutionAuthorized=false;row.automaticRolloutAuthorized=false;
      result={...row};return true;
    });
    return result;
  }

  async retire(organizationId,playbookId,input={},actor){
    let result=null;
    await this.database.mutate(db=>{
      const row=(db.portfolioOperatingPlaybooks||[]).find(x=>x.organizationId===organizationId&&x.id===playbookId);
      if(!row){const e=new Error("Operating playbook not found.");e.statusCode=404;throw e;}
      const reason=String(input.reason||"").trim().slice(0,2000);
      if(reason.length<10){const e=new Error("Retirement reason is required.");e.statusCode=400;throw e;}
      row.status="RETIRED";row.retirementReason=reason;row.retiredAt=this.now();row.retiredBy=actor||"executive";
      row.updatedAt=row.retiredAt;row.updatedBy=row.retiredBy;
      row.operationalExecutionAuthorized=false;row.automaticRolloutAuthorized=false;
      result={...row};return true;
    });
    return result;
  }
}
module.exports=PortfolioLearningPlaybookIntelligenceService;
