"use strict";

class PlaybookEvidenceLifecycleService{
  constructor(database,learningService){
    this.database=database;
    this.learning=learningService;
  }
  now(){return new Date().toISOString();}
  daysSince(v){const t=new Date(v||0).getTime();return Number.isFinite(t)&&t?Math.max(0,(Date.now()-t)/86400000):null;}

  async evaluate(organizationId,allowedLocationIds=[]){
    const learning=await this.learning.build(organizationId,allowedLocationIds);
    const db=await this.database.read();
    const playbooks=(db.portfolioOperatingPlaybooks||[]).filter(x=>x.organizationId===organizationId);
    const patterns=new Map((learning.learningPatterns||[]).map(x=>[x.id,x]));

    const items=playbooks.map(p=>{
      const current=patterns.get(p.learningPatternId)||null;
      const baseline=p.evidenceSnapshot||{};
      const baselineScore=Number.isFinite(baseline.effectivenessScore)?baseline.effectivenessScore:null;
      const currentScore=current&&Number.isFinite(current.effectivenessScore)?current.effectivenessScore:null;
      const scoreDelta=baselineScore!==null&&currentScore!==null?currentScore-baselineScore:null;
      const newEvidence=current?Math.max(0,(current.reviewedDecisions||0)-(baseline.reviewedDecisions||0)):0;
      const ageDays=this.daysSince(p.approvedAt||p.updatedAt||p.createdAt);
      const declining=scoreDelta!==null&&scoreDelta<=-15;
      const materiallyDeclining=scoreDelta!==null&&scoreDelta<=-25;
      const contradicted=current?current.ineffective>=2&&current.effectivenessScore<60:false;
      const stale=ageDays!==null&&ageDays>=90&&newEvidence===0;
      const crossLocationGap=current&&current.reviewedDecisions>=3&&current.representedLocations<2;
      const reviewRequired=p.status==="APPROVED"&&(materiallyDeclining||contradicted||stale);
      const reviewRecommended=p.status==="APPROVED"&&!reviewRequired&&(declining||crossLocationGap||newEvidence>=3);

      let evidenceStatus="CURRENT";
      if(p.status==="RETIRED") evidenceStatus="RETIRED";
      else if(reviewRequired) evidenceStatus="REVIEW_REQUIRED";
      else if(reviewRecommended) evidenceStatus="REVIEW_RECOMMENDED";
      else if(!current) evidenceStatus="NO_CURRENT_PATTERN";

      const reasons=[];
      if(materiallyDeclining) reasons.push("MATERIAL_EFFECTIVENESS_DECLINE");
      else if(declining) reasons.push("EFFECTIVENESS_DECLINE");
      if(contradicted) reasons.push("CONTRADICTORY_OUTCOMES");
      if(stale) reasons.push("STALE_WITHOUT_NEW_EVIDENCE");
      if(crossLocationGap) reasons.push("LIMITED_CROSS_LOCATION_EVIDENCE");
      if(newEvidence>=3) reasons.push("NEW_EVIDENCE_AVAILABLE");
      if(!current) reasons.push("SOURCE_PATTERN_NOT_CURRENTLY_OBSERVED");

      return {
        playbookId:p.id,title:p.title,status:p.status,learningPatternId:p.learningPatternId,
        evidenceStatus,reasons,reviewRequired,reviewRecommended,
        baseline:{score:baselineScore,reviewedDecisions:baseline.reviewedDecisions||0,representedLocations:baseline.representedLocations||0},
        current:current?{score:currentScore,reviewedDecisions:current.reviewedDecisions,representedLocations:current.representedLocations,evidenceLevel:current.evidenceLevel,effective:current.effective,partial:current.partial,ineffective:current.ineffective}:null,
        scoreDelta,newEvidence,ageDays:ageDays===null?null:Math.round(ageDays),
        localContextReviewRequired:true
      };
    });

    return {
      version:"84.25.0",generatedAt:this.now(),organizationId,
      summary:{
        playbooks:items.length,
        current:items.filter(x=>x.evidenceStatus==="CURRENT").length,
        reviewRecommended:items.filter(x=>x.reviewRecommended).length,
        reviewRequired:items.filter(x=>x.reviewRequired).length,
        stale:items.filter(x=>x.reasons.includes("STALE_WITHOUT_NEW_EVIDENCE")).length,
        declining:items.filter(x=>x.reasons.includes("EFFECTIVENESS_DECLINE")||x.reasons.includes("MATERIAL_EFFECTIVENESS_DECLINE")).length,
        contradicted:items.filter(x=>x.reasons.includes("CONTRADICTORY_OUTCOMES")).length
      },
      playbooks:items,
      policy:{
        approvalDoesNotFreezeEvidence:true,
        continuousEvidenceReview:true,
        decliningGuidanceReturnsToHumanReview:true,
        staleGuidanceReturnsToHumanReview:true,
        locationSpecificEvidenceMustRemainVisible:true,
        noAutomaticPlaybookActivation:true,
        noAutomaticPlaybookRetirement:true,
        noAutomaticOperationalExecution:true,
        autonomousProductionChanges:false
      }
    };
  }

  async acknowledgeReview(organizationId,playbookId,input={},actor){
    const note=String(input.reviewNote||"").trim().slice(0,2500);
    if(note.length<10){const e=new Error("Evidence review acknowledgement requires a review note.");e.statusCode=400;throw e;}
    let record=null;
    await this.database.mutate(db=>{
      const p=(db.portfolioOperatingPlaybooks||[]).find(x=>x.organizationId===organizationId&&x.id===playbookId);
      if(!p){const e=new Error("Operating playbook not found.");e.statusCode=404;throw e;}
      p.evidenceReviewHistory=p.evidenceReviewHistory||[];
      const review={reviewedAt:this.now(),reviewedBy:actor||"executive",reviewNote:note};
      p.evidenceReviewHistory.push(review);p.lastEvidenceReviewAt=review.reviewedAt;p.lastEvidenceReviewBy=review.reviewedBy;
      p.updatedAt=review.reviewedAt;p.updatedBy=review.reviewedBy;
      record={...p};return true;
    });
    return record;
  }
}
module.exports=PlaybookEvidenceLifecycleService;
