"use strict";

class PlaybookGovernanceAuthorityService{
  constructor(database,evidenceLifecycleService){
    this.database=database;
    this.evidenceLifecycle=evidenceLifecycleService;
  }

  now(){return new Date().toISOString();}
  roles(){
    return {
      AUTHOR:["DRAFT","REVISE"],
      REVIEWER:["REVIEW"],
      APPROVER:["APPROVE","SUSPEND","SUPERSEDE","RETIRE"],
      EXECUTIVE:["DRAFT","REVISE","REVIEW","APPROVE","SUSPEND","SUPERSEDE","RETIRE"]
    };
  }

  async policy(organizationId){
    const db=await this.database.read();
    const stored=(db.playbookGovernancePolicy||{})[organizationId]||{};
    return {
      version:"84.50.0",
      organizationId,
      requireSeparationOfDuties:stored.requireSeparationOfDuties!==false,
      requireEvidenceCurrentForApproval:stored.requireEvidenceCurrentForApproval!==false,
      permittedRoles:this.roles(),
      updatedAt:stored.updatedAt||null,
      updatedBy:stored.updatedBy||null
    };
  }

  async setPolicy(organizationId,input={},actor){
    const record={
      requireSeparationOfDuties:input.requireSeparationOfDuties!==false,
      requireEvidenceCurrentForApproval:input.requireEvidenceCurrentForApproval!==false,
      updatedAt:this.now(),
      updatedBy:actor||"executive"
    };
    await this.database.mutate(db=>{
      db.playbookGovernancePolicy=db.playbookGovernancePolicy||{};
      db.playbookGovernancePolicy[organizationId]=record;
      return true;
    });
    return this.policy(organizationId);
  }

  async getPlaybook(organizationId,playbookId){
    const db=await this.database.read();
    const p=(db.portfolioOperatingPlaybooks||[]).find(x=>x.organizationId===organizationId&&x.id===playbookId);
    if(!p){const e=new Error("Operating playbook not found.");e.statusCode=404;throw e;}
    return p;
  }

  ensureRole(role,action){
    const normalized=String(role||"").toUpperCase();
    const allowed=this.roles()[normalized]||[];
    if(!allowed.includes(action)){
      const e=new Error(`${action} requires authorized playbook governance role.`);e.statusCode=403;throw e;
    }
    return normalized;
  }

  async submitReview(organizationId,playbookId,input={},actor){
    const role=this.ensureRole(input.role,"REVIEW");
    const note=String(input.reviewNote||"").trim().slice(0,2500);
    if(note.length<10){const e=new Error("Governance review requires a review note.");e.statusCode=400;throw e;}

    let result=null;
    await this.database.mutate(db=>{
      const p=(db.portfolioOperatingPlaybooks||[]).find(x=>x.organizationId===organizationId&&x.id===playbookId);
      if(!p){const e=new Error("Operating playbook not found.");e.statusCode=404;throw e;}
      if(p.status==="RETIRED"){const e=new Error("Retired playbooks cannot enter review.");e.statusCode=409;throw e;}
      p.governanceReviews=p.governanceReviews||[];
      const review={reviewedAt:this.now(),reviewedBy:actor||"reviewer",role,reviewNote:note};
      p.governanceReviews.push(review);
      p.governanceState="REVIEWED";
      p.lastGovernanceReview=review;
      p.updatedAt=review.reviewedAt;p.updatedBy=review.reviewedBy;
      result={...p};return true;
    });
    return result;
  }

  async approve(organizationId,allowedLocationIds=[],playbookId,input={},actor){
    const role=this.ensureRole(input.role,"APPROVE");
    const p=await this.getPlaybook(organizationId,playbookId);
    const policy=await this.policy(organizationId);

    if(policy.requireSeparationOfDuties && actor && p.createdBy && actor===p.createdBy){
      const e=new Error("Separation of duties blocks the playbook author from approving the same playbook.");e.statusCode=409;throw e;
    }

    const reviews=p.governanceReviews||[];
    if(!reviews.length){
      const e=new Error("Playbook approval requires a completed governance review.");e.statusCode=409;throw e;
    }

    if(policy.requireEvidenceCurrentForApproval){
      const lifecycle=await this.evidenceLifecycle.evaluate(organizationId,allowedLocationIds);
      const evidence=lifecycle.playbooks.find(x=>x.playbookId===playbookId);
      if(evidence && evidence.reviewRequired){
        const e=new Error(`Playbook approval blocked by evidence lifecycle: ${evidence.reasons.join(", ")}`);e.statusCode=409;throw e;
      }
    }

    const note=String(input.approvalNote||"").trim().slice(0,2500);
    if(note.length<10){const e=new Error("Approval requires an approval note.");e.statusCode=400;throw e;}

    let result=null;
    await this.database.mutate(db=>{
      const row=(db.portfolioOperatingPlaybooks||[]).find(x=>x.organizationId===organizationId&&x.id===playbookId);
      row.status="APPROVED";
      row.governanceState="APPROVED";
      row.approvedAt=this.now();row.approvedBy=actor||"approver";row.approverRole=role;row.approvalNote=note;
      row.updatedAt=row.approvedAt;row.updatedBy=row.approvedBy;
      row.operationalExecutionAuthorized=false;row.automaticRolloutAuthorized=false;
      db.playbookGovernanceHistory=db.playbookGovernanceHistory||[];
      db.playbookGovernanceHistory.push({organizationId,playbookId,action:"APPROVE",at:row.approvedAt,by:row.approvedBy,role,note});
      result={...row};return true;
    });
    return result;
  }

  async transition(organizationId,playbookId,input={},actor){
    const action=String(input.action||"").toUpperCase();
    if(!["SUSPEND","SUPERSEDE","RETIRE"].includes(action)){
      const e=new Error("Governance transition must be SUSPEND, SUPERSEDE, or RETIRE.");e.statusCode=400;throw e;
    }
    const role=this.ensureRole(input.role,action);
    const reason=String(input.reason||"").trim().slice(0,2500);
    if(reason.length<10){const e=new Error(`${action} requires a reason.`);e.statusCode=400;throw e;}

    let result=null;
    await this.database.mutate(db=>{
      const p=(db.portfolioOperatingPlaybooks||[]).find(x=>x.organizationId===organizationId&&x.id===playbookId);
      if(!p){const e=new Error("Operating playbook not found.");e.statusCode=404;throw e;}

      if(action==="SUSPEND"){
        p.status="SUSPENDED";p.governanceState="SUSPENDED";p.suspendedAt=this.now();p.suspendedBy=actor||"approver";p.suspensionReason=reason;
      }else if(action==="SUPERSEDE"){
        const successorId=String(input.successorPlaybookId||"").trim();
        if(!successorId){const e=new Error("SUPERSEDE requires successorPlaybookId.");e.statusCode=400;throw e;}
        const successor=(db.portfolioOperatingPlaybooks||[]).find(x=>x.organizationId===organizationId&&x.id===successorId);
        if(!successor){const e=new Error("Successor playbook not found.");e.statusCode=404;throw e;}
        if(successor.status!=="APPROVED"){const e=new Error("Successor playbook must be approved before superseding another playbook.");e.statusCode=409;throw e;}
        p.status="SUPERSEDED";p.governanceState="SUPERSEDED";p.supersededAt=this.now();p.supersededBy=actor||"approver";p.successorPlaybookId=successorId;p.supersedeReason=reason;
      }else{
        p.status="RETIRED";p.governanceState="RETIRED";p.retiredAt=this.now();p.retiredBy=actor||"approver";p.retirementReason=reason;
      }

      p.updatedAt=this.now();p.updatedBy=actor||"approver";
      p.operationalExecutionAuthorized=false;p.automaticRolloutAuthorized=false;

      db.playbookGovernanceHistory=db.playbookGovernanceHistory||[];
      db.playbookGovernanceHistory.push({organizationId,playbookId,action,at:p.updatedAt,by:p.updatedBy,role,reason,successorPlaybookId:p.successorPlaybookId||null});
      result={...p};return true;
    });
    return result;
  }

  async audit(organizationId){
    const db=await this.database.read();
    const playbooks=(db.portfolioOperatingPlaybooks||[]).filter(x=>x.organizationId===organizationId);
    const history=(db.playbookGovernanceHistory||[]).filter(x=>x.organizationId===organizationId);
    return {
      version:"84.50.0",generatedAt:this.now(),organizationId,
      summary:{
        playbooks:playbooks.length,
        draft:playbooks.filter(x=>x.status==="DRAFT").length,
        approved:playbooks.filter(x=>x.status==="APPROVED").length,
        suspended:playbooks.filter(x=>x.status==="SUSPENDED").length,
        superseded:playbooks.filter(x=>x.status==="SUPERSEDED").length,
        retired:playbooks.filter(x=>x.status==="RETIRED").length,
        governanceEvents:history.length
      },
      history,
      policy:{
        roleBasedPlaybookAuthority:true,
        separationOfDutiesSupported:true,
        evidenceGateBeforeApproval:true,
        humanApprovalRequired:true,
        humanSuspensionRequired:true,
        humanSupersessionRequired:true,
        humanRetirementRequired:true,
        noAutomaticOperationalExecution:true,
        noAutomaticCrossLocationRollout:true,
        autonomousProductionChanges:false
      }
    };
  }
}
module.exports=PlaybookGovernanceAuthorityService;
