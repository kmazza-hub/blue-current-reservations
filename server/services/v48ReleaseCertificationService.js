"use strict";
class V48ReleaseCertificationService {
  constructor(database,pilotValueScorecardService,pilotProofProgramService,executivePilotReviewService,pilotDecisionLedgerService,expansionReadinessService){
    Object.assign(this,{database,pilotValueScorecardService,pilotProofProgramService,executivePilotReviewService,pilotDecisionLedgerService,expansionReadinessService});
  }
  now(){return new Date().toISOString();}
  async snapshot(organizationId,allowedLocationIds){
    const [scorecard,proof,review,ledger,expansion]=await Promise.all([
      this.pilotValueScorecardService.snapshot(organizationId,allowedLocationIds),
      this.pilotProofProgramService.snapshot(organizationId,allowedLocationIds),
      this.executivePilotReviewService.snapshot(organizationId,allowedLocationIds),
      this.pilotDecisionLedgerService.snapshot(organizationId,allowedLocationIds),
      this.expansionReadinessService.snapshot(organizationId,allowedLocationIds)
    ]);
    const contracts=[
      {id:"baseline",label:"Pilot value baseline",passed:scorecard.status!=="baseline-required"},
      {id:"proof",label:"Proof program",passed:proof.status==="proof-program-active"},
      {id:"review",label:"Executive review packet",passed:!!review.packet},
      {id:"decision-boundary",label:"Human decision boundary",passed:ledger.policy?.automaticApproval===false&&ledger.policy?.automaticExpansion===false},
      {id:"activation-boundary",label:"Human activation boundary",passed:expansion.policy?.automaticActivation===false&&expansion.policy?.automaticExpansion===false}
    ];
    const passed=contracts.filter(x=>x.passed).length;
    return {
      version:"48.30.0",generatedAt:this.now(),status:passed===contracts.length?"V48-CERTIFIED":"V48-OPERATIONAL-WITH-OPEN-PILOT-STATE",
      headline:passed===contracts.length?"V48 commercial proof architecture is certified across the complete pilot-to-expansion decision chain.":"V48 code and safety contracts are operational; current pilot state still has prerequisite evidence or decisions open.",
      contracts,passed,total:contracts.length,
      chain:[
        {stage:"BASELINE",state:scorecard.status},
        {stage:"PROVE",state:proof.status},
        {stage:"REVIEW",state:review.status},
        {stage:"DECIDE",state:ledger.latestDecision?.decision||"UNSIGNED"},
        {stage:"PLAN",state:expansion.status}
      ],
      evidence:{verifiedRealizedImpactDollars:review.packet?.evidence?.verifiedRealizedImpactDollars||0,locationsReviewed:review.packet?.locationReview?.length||0,exceptions:review.packet?.exceptions?.length||0},
      policy:{readOnlyCertification:true,automaticAttribution:false,automaticApproval:false,automaticExpansion:false,automaticActivation:false,humanCommercialControl:true}
    };
  }
}
module.exports=V48ReleaseCertificationService;
