"use strict";

class ExecutiveDecisionOutcomeIntelligenceService {
  constructor(database, decisionLedgerService) {
    this.database = database;
    this.ledger = decisionLedgerService;
  }

  now(){ return new Date().toISOString(); }

  async build(organizationId, allowedLocationIds=[]){
    const ledger = await this.ledger.list(organizationId, allowedLocationIds);
    const decisions = ledger.decisions || [];
    const reviewed = decisions.filter(x => x.status === "REVIEWED" && x.outcomeRating);

    const byType = new Map();
    const byReason = new Map();
    const byOwner = new Map();

    for (const row of reviewed){
      const type = row.decisionType || "UNKNOWN";
      const reason = row.reason || "UNKNOWN";
      const owner = row.accountableOwner || "UNASSIGNED";

      if(!byType.has(type)) byType.set(type, []);
      if(!byReason.has(reason)) byReason.set(reason, []);
      if(!byOwner.has(owner)) byOwner.set(owner, []);

      byType.get(type).push(row);
      byReason.get(reason).push(row);
      byOwner.get(owner).push(row);
    }

    const score = rows => {
      if(!rows.length) return null;
      const points = rows.reduce((sum,row) => sum + (
        row.outcomeRating === "EFFECTIVE" ? 1 :
        row.outcomeRating === "PARTIAL" ? 0.5 : 0
      ),0);
      return Math.round((points / rows.length) * 100);
    };

    const interventions = [...byType.entries()].map(([decisionType,rows]) => ({
      decisionType,
      reviewedDecisions: rows.length,
      effective: rows.filter(x=>x.outcomeRating==="EFFECTIVE").length,
      partial: rows.filter(x=>x.outcomeRating==="PARTIAL").length,
      ineffective: rows.filter(x=>x.outcomeRating==="INEFFECTIVE").length,
      effectivenessScore: score(rows),
      evidenceLevel: rows.length >= 5 ? "STRONG" : rows.length >= 3 ? "DEVELOPING" : "EARLY"
    })).sort((a,b)=>(b.effectivenessScore??-1)-(a.effectivenessScore??-1));

    const recurringIssues = [...byReason.entries()].map(([reason,rows]) => {
      const locations = [...new Set(rows.map(x=>x.locationId).filter(Boolean))];
      const ineffective = rows.filter(x=>x.outcomeRating==="INEFFECTIVE").length;
      const partial = rows.filter(x=>x.outcomeRating==="PARTIAL").length;
      const systemic = locations.length >= 2 && rows.length >= 3 && (ineffective + partial) >= 2;
      return {
        reason,
        reviewedDecisions: rows.length,
        affectedLocations: locations.length,
        effectivenessScore: score(rows),
        unresolvedPatternCount: ineffective + partial,
        systemicPattern: systemic,
        attention: systemic ? "EXECUTIVE_REVIEW" : (ineffective + partial >= 2 ? "LEADERSHIP_REVIEW" : "MONITOR")
      };
    }).sort((a,b)=>{
      if(a.systemicPattern!==b.systemicPattern) return a.systemicPattern ? -1 : 1;
      return b.unresolvedPatternCount-a.unresolvedPatternCount;
    });

    const leadershipLeverage = [...byOwner.entries()].map(([accountableOwner,rows]) => ({
      accountableOwner,
      reviewedDecisions: rows.length,
      effectivenessScore: score(rows),
      effective: rows.filter(x=>x.outcomeRating==="EFFECTIVE").length,
      partial: rows.filter(x=>x.outcomeRating==="PARTIAL").length,
      ineffective: rows.filter(x=>x.outcomeRating==="INEFFECTIVE").length
    })).sort((a,b)=>(b.effectivenessScore??-1)-(a.effectivenessScore??-1));

    const overdueOpen = decisions.filter(x=>x.status==="OPEN" && x.overdue);
    const systemicPatterns = recurringIssues.filter(x=>x.systemicPattern);

    return {
      version:"83.75.0",
      generatedAt:this.now(),
      organizationId,
      summary:{
        decisions:decisions.length,
        reviewed:reviewed.length,
        open:decisions.filter(x=>x.status==="OPEN").length,
        overdue:overdueOpen.length,
        effective:reviewed.filter(x=>x.outcomeRating==="EFFECTIVE").length,
        partial:reviewed.filter(x=>x.outcomeRating==="PARTIAL").length,
        ineffective:reviewed.filter(x=>x.outcomeRating==="INEFFECTIVE").length,
        overallEffectivenessScore:score(reviewed),
        systemicPatterns:systemicPatterns.length
      },
      interventionEffectiveness:interventions,
      recurringIssues,
      leadershipLeverage,
      systemicPatterns,
      overdueDecisions:overdueOpen.map(x=>({
        id:x.id,
        exceptionId:x.exceptionId,
        locationId:x.locationId,
        decisionType:x.decisionType,
        accountableOwner:x.accountableOwner,
        followUpAt:x.followUpAt
      })),
      guidance:{
        bestSupportedIntervention:interventions.find(x=>x.evidenceLevel!=="EARLY") || interventions[0] || null,
        executiveReviewRequired:systemicPatterns.length>0 || overdueOpen.length>0,
        reason:systemicPatterns.length
          ? "Repeated weak outcomes across multiple locations indicate a possible systemic operating issue."
          : overdueOpen.length
            ? "One or more executive decisions are overdue for human outcome review."
            : "No systemic decision-outcome pattern currently requires executive review."
      },
      policy:{
        descriptiveIntelligenceOnly:true,
        noAutomaticDecisionSelection:true,
        noAutomaticOperationalAction:true,
        noAutomaticPersonnelJudgment:true,
        humanInterpretationRequired:true,
        humanExecutiveAuthorityPreserved:true,
        autonomousProductionChanges:false
      }
    };
  }
}

module.exports = ExecutiveDecisionOutcomeIntelligenceService;
