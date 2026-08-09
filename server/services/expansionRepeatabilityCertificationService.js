"use strict";

class ExpansionRepeatabilityCertificationService {
  constructor(database,auditService,realtimeHub,expansionPortfolioProofService){
    Object.assign(this,{database,auditService,realtimeHub,expansionPortfolioProofService});
  }
  now(){return new Date().toISOString();}
  async playbooks(org){
    const db=await this.database.read();
    return (db.expansionRepeatabilityPlaybooks||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  }
  async certifications(org){
    const db=await this.database.read();
    return (db.expansionRepeatabilityCertifications||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.certifiedAt)-new Date(a.certifiedAt));
  }
  async snapshot(org,allowed){
    const [proof,playbooks,certifications]=await Promise.all([
      this.expansionPortfolioProofService.snapshot(org,allowed),this.playbooks(org),this.certifications(org)
    ]);
    const playbook=playbooks[0]||null,certification=certifications[0]||null;
    const repeatApproved=proof.decision?.decision==="REPEAT";
    const sections=playbook?.sections||{};
    const required=["preflight","configuration","connectors","training","activation","observation","support","incidentResponse","pauseRollback","closeout"];
    const sectionChecks=required.map(id=>({id:`PLAYBOOK_${id.toUpperCase()}`,passed:!!String(sections[id]||"").trim(),actual:String(sections[id]||"").trim()?"documented":"missing"}));
    const governance=playbook?.governance||{};
    const checks=[
      {id:"PORTFOLIO_REPEAT_APPROVED",passed:repeatApproved,actual:proof.decision?.decision||"not decided"},
      ...sectionChecks,
      {id:"ROLE_OWNERSHIP",passed:!!governance.executiveOwner&&!!governance.operationsOwner&&!!governance.technicalOwner,actual:governance.executiveOwner?`${governance.executiveOwner} / ${governance.operationsOwner} / ${governance.technicalOwner}`:"incomplete"},
      {id:"PAUSE_AUTHORITY",passed:!!governance.pauseAuthority,actual:governance.pauseAuthority||"not assigned"},
      {id:"MAX_CONCURRENT_DEFAULT",passed:Number(governance.maxConcurrentLocations)>0,actual:String(governance.maxConcurrentLocations||"not set")},
      {id:"SUCCESS_CRITERIA",passed:!!String(playbook?.successCriteria||"").trim(),actual:playbook?.successCriteria?"documented":"missing"},
      {id:"FAILURE_CRITERIA",passed:!!String(playbook?.failureCriteria||"").trim(),actual:playbook?.failureCriteria?"documented":"missing"},
      {id:"EVIDENCE_STANDARD",passed:!!String(playbook?.evidenceStandard||"").trim(),actual:playbook?.evidenceStandard?"documented":"missing"},
      {id:"HUMAN_CERTIFICATION",passed:certification?.status==="REPEATABILITY_CERTIFIED",actual:certification?.status||"not certified"}
    ];
    return {
      version:"52.50.0",generatedAt:this.now(),
      status:certification?.status==="REPEATABILITY_CERTIFIED"?"expansion-repeatability-certified":playbook?"expansion-playbook-in-review":"expansion-playbook-required",
      headline:`${checks.filter(x=>x.passed).length}/${checks.length} repeatability-certification gates pass.`,
      proofStatus:proof.status,repeatApproved,playbook,certification,checks,
      certificationReady:checks.slice(0,-1).every(x=>x.passed),
      rolloutTemplate:playbook?{
        sourcePlaybookId:playbook.id,
        maxConcurrentLocations:governance.maxConcurrentLocations,
        requiredSections:required,
        humanActivationRequired:true,
        humanPauseRollbackAuthority:governance.pauseAuthority,
        automaticDeployment:false,
        automaticActivation:false
      }:null,
      policy:{
        portfolioRepeatDecisionRequired:true,
        reusablePlaybookRequired:true,
        namedOwnershipRequired:true,
        pauseAuthorityRequired:true,
        successFailureCriteriaRequired:true,
        evidenceStandardRequired:true,
        humanRepeatabilityCertificationRequired:true,
        certificationDoesNotStartRollout:true,
        certificationDoesNotDeploy:true,
        certificationDoesNotActivateLocations:true,
        noAutomaticExpansion:true,
        autonomousProductionChanges:false
      }
    };
  }
  async createPlaybook(org,allowed,input,actor){
    const proof=await this.expansionPortfolioProofService.snapshot(org,allowed);
    if(proof.decision?.decision!=="REPEAT")throw new Error("A human REPEAT portfolio decision is required before creating the repeatability playbook.");
    const required=["preflight","configuration","connectors","training","activation","observation","support","incidentResponse","pauseRollback","closeout"];
    const sections={};
    for(const key of required){
      const value=String(input.sections?.[key]||"").trim();
      if(!value)throw new Error(`Playbook section ${key} is required.`);
      sections[key]=value.slice(0,5000);
    }
    const governance={
      executiveOwner:String(input.executiveOwner||"").trim(),
      operationsOwner:String(input.operationsOwner||"").trim(),
      technicalOwner:String(input.technicalOwner||"").trim(),
      pauseAuthority:String(input.pauseAuthority||"").trim(),
      maxConcurrentLocations:Math.max(1,Number(input.maxConcurrentLocations)||0)
    };
    if(!governance.executiveOwner||!governance.operationsOwner||!governance.technicalOwner||!governance.pauseAuthority)throw new Error("Executive, operations, technical, and pause-authority ownership are required.");
    const successCriteria=String(input.successCriteria||"").trim(),failureCriteria=String(input.failureCriteria||"").trim(),evidenceStandard=String(input.evidenceStandard||"").trim();
    if(!successCriteria||!failureCriteria||!evidenceStandard)throw new Error("Success criteria, failure criteria, and evidence standard are required.");
    const record={
      id:`erpbook_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId:org,
      status:"PLAYBOOK_GENERATED",createdAt:this.now(),createdBy:actor,
      name:String(input.name||"Blue Current Expansion Playbook").trim().slice(0,180),
      sourcePortfolioDecisionId:proof.decision.id,sections,governance,
      successCriteria:successCriteria.slice(0,4000),failureCriteria:failureCriteria.slice(0,4000),
      evidenceStandard:evidenceStandard.slice(0,4000),lessonsImported:proof.assessment?.replicationLessons||"",
      note:String(input.note||"").trim().slice(0,1800),
      rolloutStarted:false,deploymentPerformed:false,locationActivated:false
    };
    await this.database.mutate(db=>{db.expansionRepeatabilityPlaybooks||=[];db.expansionRepeatabilityPlaybooks.push(record);return record;});
    await this.auditService.record({organizationId:org,actor,action:"Expansion repeatability playbook generated; no rollout started",category:"expansion_repeatability"});
    this.realtimeHub.publish("expansion-repeatability:playbook-generated",{organizationId:org,id:record.id});
    return record;
  }
  async certify(org,allowed,input,actor){
    const state=await this.snapshot(org,allowed);
    if(!state.certificationReady)throw new Error("All repeatability gates must pass before certification.");
    const evidence=String(input.evidence||"").trim(),note=String(input.note||"").trim();
    if(!evidence||!note)throw new Error("Human certification evidence and note are required.");
    const record={
      id:`erc_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId:org,
      playbookId:state.playbook.id,status:"REPEATABILITY_CERTIFIED",
      certifiedAt:this.now(),certifiedBy:actor,evidence:evidence.slice(0,4000),note:note.slice(0,2200),
      gateSnapshot:state.checks.slice(0,-1),
      rolloutStartedByCertification:false,deploymentPerformedByCertification:false,
      locationsActivatedByCertification:false,autonomousProductionChanges:false
    };
    await this.database.mutate(db=>{db.expansionRepeatabilityCertifications||=[];db.expansionRepeatabilityCertifications.push(record);return record;});
    await this.auditService.record({organizationId:org,actor,action:"Expansion repeatability certified; certification did not start rollout, deploy, or activate locations",category:"expansion_repeatability"});
    this.realtimeHub.publish("expansion-repeatability:certified",{organizationId:org,id:record.id});
    return record;
  }
}
module.exports=ExpansionRepeatabilityCertificationService;
