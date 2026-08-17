"use strict";

class IntelligenceConsolidationService{
  constructor(services={}){
    this.services=services;
  }
  now(){return new Date().toISOString();}

  async build(organizationId,allowedLocationIds=[]){
    const {
      portfolioExceptionCommandService,
      portfolioDecisionAccountabilityService,
      executiveDecisionOutcomeIntelligenceService,
      portfolioLearningPlaybookIntelligenceService,
      playbookEvidenceLifecycleService,
      playbookGovernanceAuthorityService
    }=this.services;

    const [exceptions,decisions,outcomes,learning,evidence,governance]=await Promise.all([
      portfolioExceptionCommandService?.build?.(organizationId,allowedLocationIds).catch(()=>null),
      portfolioDecisionAccountabilityService?.list?.(organizationId,allowedLocationIds).catch(()=>null),
      executiveDecisionOutcomeIntelligenceService?.build?.(organizationId,allowedLocationIds).catch(()=>null),
      portfolioLearningPlaybookIntelligenceService?.build?.(organizationId,allowedLocationIds).catch(()=>null),
      playbookEvidenceLifecycleService?.evaluate?.(organizationId,allowedLocationIds).catch(()=>null),
      playbookGovernanceAuthorityService?.audit?.(organizationId).catch(()=>null)
    ]);

    const decisionRows=decisions?.decisions||[];
    const exceptionRows=exceptions?.exceptions||exceptions?.items||[];
    const playbookRows=learning?.playbooks||[];

    const attention=[];
    for(const x of exceptionRows){
      if(x.status==="OPEN"||x.escalationRequired||x.executiveAttentionRequired){
        attention.push({type:"PORTFOLIO_EXCEPTION",id:x.id,locationId:x.locationId||null,severity:x.severity||x.priority||"ATTENTION",reason:x.reason||x.title||"Portfolio exception"});
      }
    }
    for(const x of decisionRows){
      if(x.status==="OPEN"&&x.overdue){
        attention.push({type:"OVERDUE_DECISION",id:x.id,locationId:x.locationId||null,severity:"ATTENTION",reason:`${x.decisionType||"Decision"} requires outcome review`});
      }
    }
    for(const x of evidence?.playbooks||[]){
      if(x.reviewRequired||x.reviewRecommended){
        attention.push({type:x.reviewRequired?"PLAYBOOK_REVIEW_REQUIRED":"PLAYBOOK_REVIEW_RECOMMENDED",id:x.playbookId,locationId:null,severity:x.reviewRequired?"ATTENTION":"WATCH",reason:(x.reasons||[]).join(", ")||"Playbook evidence changed"});
      }
    }
    for(const x of outcomes?.systemicPatterns||[]){
      attention.push({type:"SYSTEMIC_PATTERN",id:x.reason||"systemic-pattern",locationId:null,severity:"ATTENTION",reason:x.reason||"Systemic portfolio pattern"});
    }

    const authorityMap={
      portfolioExceptions:"portfolioExceptionCommandService",
      executiveDecisions:"portfolioDecisionAccountabilityService",
      outcomeIntelligence:"executiveDecisionOutcomeIntelligenceService",
      organizationalLearning:"portfolioLearningPlaybookIntelligenceService",
      playbookEvidence:"playbookEvidenceLifecycleService",
      playbookGovernance:"playbookGovernanceAuthorityService"
    };

    return {
      version:"84.75.0",
      generatedAt:this.now(),
      organizationId,
      architecture:{
        status:"CONSOLIDATED",
        architectureFreezeCandidate:true,
        authoritativeServices:authorityMap,
        consolidatedReadModel:"intelligenceConsolidationService",
        duplicateWriteAuthority:false,
        compatibilityLayersRetained:true
      },
      summary:{
        openPortfolioExceptions:exceptionRows.filter(x=>x.status==="OPEN").length,
        executiveDecisions:decisionRows.length,
        openDecisions:decisionRows.filter(x=>x.status==="OPEN").length,
        overdueDecisions:decisionRows.filter(x=>x.status==="OPEN"&&x.overdue).length,
        systemicPatterns:(outcomes?.systemicPatterns||[]).length,
        learningPatterns:(learning?.learningPatterns||[]).length,
        approvedPlaybooks:playbookRows.filter(x=>x.status==="APPROVED").length,
        playbooksReviewRequired:(evidence?.playbooks||[]).filter(x=>x.reviewRequired).length,
        governanceEvents:governance?.summary?.governanceEvents||0,
        attentionItems:attention.length
      },
      attention:attention.sort((a,b)=>{
        const rank={ATTENTION:3,WATCH:2,INFO:1};
        return (rank[b.severity]||0)-(rank[a.severity]||0);
      }),
      layers:{
        exceptions:exceptions?.summary||null,
        decisions:decisions?.summary||null,
        outcomes:outcomes?.summary||null,
        learning:learning?.summary||null,
        evidence:evidence?.summary||null,
        governance:governance?.summary||null
      },
      policy:{
        oneAuthoritativeServicePerResponsibility:true,
        consolidatedReadModelOnly:true,
        noDuplicateWritePathIntroduced:true,
        noAutomaticDecisionSelection:true,
        noAutomaticPlaybookExecution:true,
        noAutomaticCrossLocationRollout:true,
        humanAuthorityPreserved:true,
        autonomousProductionChanges:false
      }
    };
  }
}
module.exports=IntelligenceConsolidationService;
