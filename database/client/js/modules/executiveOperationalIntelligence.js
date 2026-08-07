(() => {
  "use strict";

  const KEYS = {
    incidents:"blueCurrent.incidentResponse.v34.0.6",
    decisions:"blueCurrent.executiveDecisionCenter.v34.0.11",
    outcomes:"blueCurrent.decisionOutcomeTracker.v34.0.12",
    replay:"blueCurrent.executiveReplayAnalytics.v34.0.14.2",
    retraining:"blueCurrent.retrainingPlannerHistory.v34.0.13.9",
    actions:"blueCurrent.executiveOperationalIntelligence.v34.0.14.5"
  };

  const byId = id => document.getElementById(id);
  let lastAnalysis = null;

  function read(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || {};
    } catch {
      return {};
    }
  }

  function arrayFrom(key,name) {
    const value = read(key);
    return Array.isArray(value[name]) ? value[name] : [];
  }

  function textCorpus(items) {
    return items
      .map(item => `${item.title || ""} ${item.detail || ""} ${item.why || ""} ${item.note || ""}`.toLowerCase())
      .join(" ");
  }

  function countMatches(text,pattern) {
    return (text.match(pattern) || []).length;
  }

  function analyze() {
    const incidents = arrayFrom(KEYS.incidents,"incidents");
    const decisions = arrayFrom(KEYS.decisions,"decisions");
    const outcomes = arrayFrom(KEYS.outcomes,"outcomes");
    const sessions = arrayFrom(KEYS.replay,"savedSessions");
    const plans = arrayFrom(KEYS.retraining,"history");

    const measured = outcomes.filter(item => item.status === "measured");
    const openIncidents = incidents.filter(item => item.status === "open");
    const completedDecisions = decisions.filter(item => item.status === "completed");
    const corpus = textCorpus([...incidents,...decisions,...outcomes,...plans]);

    const domains = [
      {
        key:"kitchen",
        label:"Kitchen flow",
        pattern:/kitchen|ticket|expo|station|grill|course/g,
        source:"kitchenExpoCommand",
        owner:"Kitchen Manager"
      },
      {
        key:"floor",
        label:"Dining-room flow",
        pattern:/table|floor|seating|server|section|turn/g,
        source:"liveFloorOperationsV2",
        owner:"General Manager"
      },
      {
        key:"labor",
        label:"Labor coverage",
        pattern:/labor|staff|coverage|callout|employee|runner/g,
        source:"workforceFoundation",
        owner:"Operations Manager"
      },
      {
        key:"demand",
        label:"Demand and reservations",
        pattern:/reservation|demand|arrival|walk-in|capacity|patio/g,
        source:"domainForecastingCenter",
        owner:"General Manager"
      }
    ].map(domain => ({
      ...domain,
      mentions:countMatches(corpus,domain.pattern)
    })).sort((a,b) => b.mentions-a.mentions);

    const topDomain = domains[0];
    const recurring = domains.filter(domain => domain.mentions >= 2);

    const underperformed = measured.filter(item => item.classification === "underperformed");
    const partial = measured.filter(item => item.classification === "partial");
    const successful = measured.filter(item => item.classification === "successful");

    const observedValue = measured.reduce((sum,item) => sum + Number(item.observedValue || 0),0);
    const predictedValue = measured.reduce((sum,item) => sum + Number(item.predictedValue || 0),0);
    const recoverableGap = Math.max(0,predictedValue-observedValue);
    const openDecisionValue = decisions
      .filter(item => item.status === "open")
      .reduce((sum,item) => sum + Number(item.revenueImpact || 0),0);
    const revenueOpportunity = Math.round(recoverableGap + openDecisionValue);

    const criticalIncidents = incidents.filter(item => item.severity === "critical").length;
    const recurringCount = recurring.length;
    const signals = incidents.length + decisions.length + measured.length + sessions.length + plans.length;

    const confidence = Math.max(55,Math.min(97,
      Math.round(58 + Math.min(20,signals*1.5) + Math.min(19,measured.length*3))
    ));

    const priorityScore = Math.max(0,Math.min(100,
      criticalIncidents*12 +
      openIncidents.length*6 +
      underperformed.length*10 +
      recurringCount*7 +
      Math.min(25,Math.round(revenueOpportunity/250))
    ));

    const causes = [];
    if (topDomain?.mentions) {
      causes.push({
        tone:topDomain.mentions >= 4 ? "risk" : "watch",
        title:`${topDomain.label} is the strongest recurring signal`,
        detail:`Detected ${topDomain.mentions} references across incidents, decisions, outcomes, and maintenance plans.`,
        source:topDomain.source
      });
    }
    if (criticalIncidents) {
      causes.push({
        tone:"risk",
        title:"Critical incidents are suppressing shift performance",
        detail:`${criticalIncidents} critical incident${criticalIncidents === 1 ? "" : "s"} remain in the retained operating history.`,
        source:"missionIncidentCenter"
      });
    }
    if (underperformed.length) {
      causes.push({
        tone:"risk",
        title:"Some executive actions are not producing expected value",
        detail:`${underperformed.length} measured decision${underperformed.length === 1 ? "" : "s"} underperformed the recorded target.`,
        source:"decisionOutcomeTracker"
      });
    }
    if (!causes.length) {
      causes.push({
        tone:"stable",
        title:"No dominant root cause detected",
        detail:"Current retained evidence does not show a material recurring operational failure.",
        source:"executiveIntelligenceTimeline"
      });
    }

    const opportunities = [
      {
        tone:revenueOpportunity >= 1000 ? "risk" : revenueOpportunity > 0 ? "watch" : "stable",
        title:"Recover measurable operating value",
        detail:`Estimated recoverable or uncommitted value is $${revenueOpportunity.toLocaleString()}.`,
        value:revenueOpportunity,
        source:"executiveDecisionCenter"
      },
      {
        tone:successful.length ? "stable" : "watch",
        title:"Scale successful executive actions",
        detail:`${successful.length} successful measured decision${successful.length === 1 ? "" : "s"} can be reviewed for repeatable operating patterns.`,
        value:successful.length*250,
        source:"decisionOutcomeTracker"
      },
      {
        tone:recurringCount ? "watch" : "stable",
        title:"Remove recurring operational friction",
        detail:`${recurringCount} domain${recurringCount === 1 ? "" : "s"} show repeated evidence across retained shifts.`,
        value:recurringCount*180,
        source:"executivePerformanceTrends"
      }
    ].sort((a,b) => b.value-a.value);

    const actionDefinitions = [];
    if (topDomain?.mentions) {
      actionDefinitions.push({
        id:`review_${topDomain.key}`,
        priority:topDomain.mentions >= 4 ? 1 : 2,
        tone:topDomain.mentions >= 4 ? "risk" : "watch",
        title:`Review ${topDomain.label.toLowerCase()} before the next peak shift`,
        detail:`Assign ${topDomain.owner} to validate the recurring signal and document the corrective action.`,
        source:topDomain.source
      });
    }
    if (openIncidents.length) {
      actionDefinitions.push({
        id:"resolve_open_incidents",
        priority:1,
        tone:"risk",
        title:"Close unresolved operational incidents",
        detail:`${openIncidents.length} open incident${openIncidents.length === 1 ? "" : "s"} remain available for executive review.`,
        source:"missionIncidentCenter"
      });
    }
    if (underperformed.length || partial.length) {
      actionDefinitions.push({
        id:"review_decision_effectiveness",
        priority:2,
        tone:"watch",
        title:"Review decision effectiveness",
        detail:`Analyze ${underperformed.length + partial.length} partial or underperforming measured outcome${underperformed.length + partial.length === 1 ? "" : "s"}.`,
        source:"outcomeLearningEngine"
      });
    }
    if (revenueOpportunity > 0) {
      actionDefinitions.push({
        id:"capture_revenue_opportunity",
        priority:2,
        tone:revenueOpportunity >= 1000 ? "risk" : "watch",
        title:"Assign owner to the top revenue opportunity",
        detail:`Review $${revenueOpportunity.toLocaleString()} in recoverable or uncommitted value.`,
        source:"executiveDecisionCenter"
      });
    }
    if (!actionDefinitions.length) {
      actionDefinitions.push({
        id:"maintain_plan",
        priority:3,
        tone:"stable",
        title:"Maintain the current operating plan",
        detail:"No material executive intervention is required from the retained evidence.",
        source:"liveShiftCommander"
      });
    }

    const storedActions = read(KEYS.actions);
    const completed = new Set(Array.isArray(storedActions.completed) ? storedActions.completed : []);
    const actions = actionDefinitions.map(action => ({
      ...action,
      complete:completed.has(action.id)
    })).sort((a,b) => a.priority-b.priority);

    const topRisk = causes[0]?.title || "No material risk";
    const topOpportunity = opportunities[0]?.title || "Maintain plan";
    const owner = topDomain?.owner || "General Manager";

    return {
      incidents,
      decisions,
      measured,
      sessions,
      plans,
      domains,
      recurring,
      causes,
      opportunities,
      actions,
      signals,
      recurringCount,
      revenueOpportunity,
      priorityScore,
      confidence,
      topRisk,
      topOpportunity,
      owner,
      successful,
      underperformed,
      partial
    };
  }

  function renderCards(rootId,items,className,countId) {
    const root = byId(rootId);
    root.replaceChildren();

    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "executive-operational-intelligence-empty";
      empty.textContent = "No intelligence signals are available.";
      root.append(empty);
      byId(countId).textContent = "0";
      return;
    }

    items.forEach(item => {
      const card = document.createElement("article");
      card.className = className;
      card.dataset.tone = item.tone;
      card.innerHTML = "<strong></strong><span></span>";
      card.querySelector("strong").textContent = item.title;
      card.querySelector("span").textContent = item.detail;
      if (item.source) {
        card.addEventListener("click",() => {
          byId(item.source)?.scrollIntoView({behavior:"smooth",block:"start"});
        });
      }
      root.append(card);
    });

    byId(countId).textContent =
      `${items.length} ${items.length === 1 ? "item" : "items"}`;
  }

  function renderRecurring(analysis) {
    const items = analysis.recurring.map(domain => ({
      tone:domain.mentions >= 4 ? "risk" : "watch",
      title:domain.label,
      detail:`Repeated ${domain.mentions} times across retained operational evidence.`,
      source:domain.source
    }));
    renderCards(
      "executiveRecurringPatternList",
      items,
      "executive-recurring-pattern-item",
      "executiveRecurringPatternCount"
    );
  }

  function renderActions(analysis) {
    const root = byId("executiveActionQueueList");
    root.replaceChildren();

    analysis.actions.forEach(action => {
      const item = document.createElement("article");
      item.className = "executive-action-queue-item";
      item.dataset.tone = action.tone;
      item.classList.toggle("is-complete",action.complete);

      const priority = document.createElement("span");
      priority.className = "executive-action-priority";
      priority.textContent = `P${action.priority}`;

      const copy = document.createElement("div");
      copy.className = "executive-action-copy";
      copy.innerHTML = "<strong></strong><span></span>";
      copy.querySelector("strong").textContent = action.title;
      copy.querySelector("span").textContent = action.detail;

      const button = document.createElement("button");
      button.type = "button";
      button.textContent = action.complete ? "Completed" : "Complete";
      button.addEventListener("click",() => toggleAction(action.id));

      item.addEventListener("dblclick",() => {
        byId(action.source)?.scrollIntoView({behavior:"smooth",block:"start"});
      });

      item.append(priority,copy,button);
      root.append(item);
    });
  }

  function toggleAction(id) {
    const stored = read(KEYS.actions);
    const completed = new Set(Array.isArray(stored.completed) ? stored.completed : []);

    if (completed.has(id)) completed.delete(id);
    else completed.add(id);

    localStorage.setItem(KEYS.actions,JSON.stringify({
      completed:[...completed],
      updatedAt:new Date().toISOString()
    }));

    render();
  }

  function render() {
    const analysis = analyze();
    lastAnalysis = analysis;

    byId("executiveOperationalIntelligenceScore").textContent =
      String(analysis.priorityScore);
    byId("executiveOperationalIntelligenceLabel").textContent =
      analysis.priorityScore >= 70 ? "Immediate executive focus" :
      analysis.priorityScore >= 35 ? "Managed attention required" :
      "Operations broadly controlled";
    byId("executiveOperationalIntelligenceScoreCard").dataset.tone =
      analysis.priorityScore >= 70 ? "risk" :
      analysis.priorityScore >= 35 ? "watch" : "stable";

    byId("executiveIntelligenceSignalCount").textContent = String(analysis.signals);
    byId("executiveIntelligenceRecurringCount").textContent =
      String(analysis.recurringCount);
    byId("executiveIntelligenceRevenueOpportunity").textContent =
      `$${analysis.revenueOpportunity.toLocaleString()}`;
    byId("executiveIntelligencePriorityCount").textContent =
      String(analysis.actions.filter(action => !action.complete).length);
    byId("executiveIntelligenceConfidence").textContent =
      `${analysis.confidence}%`;

    renderCards(
      "executiveRootCauseList",
      analysis.causes,
      "executive-root-cause-item",
      "executiveRootCauseCount"
    );
    renderRecurring(analysis);
    renderCards(
      "executiveOpportunityList",
      analysis.opportunities,
      "executive-opportunity-item",
      "executiveOpportunityCount"
    );
    renderActions(analysis);

    byId("executiveOperationalMorningBriefTitle").textContent =
      analysis.priorityScore >= 70
        ? "Leadership intervention is recommended before the next peak shift."
        : analysis.priorityScore >= 35
          ? "Targeted management follow-up is recommended."
          : "Operations are broadly controlled; focus on repeatable improvements.";

    byId("executiveOperationalMorningBriefDetail").textContent =
      `${analysis.topRisk}. The highest-value opportunity is: ${analysis.topOpportunity}. Intelligence confidence is ${analysis.confidence}%.`;
    byId("executiveMorningTopRisk").textContent = analysis.topRisk;
    byId("executiveMorningTopOpportunity").textContent = analysis.topOpportunity;
    byId("executiveMorningOwner").textContent = analysis.owner;
    byId("executiveMorningReviewWindow").textContent =
      analysis.priorityScore >= 70 ? "Before next peak shift" :
      analysis.priorityScore >= 35 ? "Tomorrow morning" : "Next management review";

    byId("executiveOperationalIntelligenceUpdated").textContent =
      `Updated ${new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit"}).format(new Date())}.`;
  }

  function copyBrief() {
    if (!lastAnalysis) return;

    const a = lastAnalysis;
    const text = [
      "Blue Current Tomorrow Morning Briefing",
      `Priority score: ${a.priorityScore}`,
      `Insight confidence: ${a.confidence}%`,
      `Top risk: ${a.topRisk}`,
      `Top opportunity: ${a.topOpportunity}`,
      `Estimated revenue opportunity: $${a.revenueOpportunity.toLocaleString()}`,
      `Recommended owner: ${a.owner}`,
      "",
      "Executive actions:",
      ...a.actions.filter(action => !action.complete).map(action =>
        `P${action.priority} — ${action.title}: ${action.detail}`
      )
    ].join("\n");

    navigator.clipboard?.writeText(text).then(() => {
      byId("executiveMorningBriefStatus").textContent =
        "Morning briefing copied.";
    }).catch(() => {
      byId("executiveMorningBriefStatus").textContent =
        "Copy unavailable in this browser.";
    });
  }

  function clearCompleted() {
    localStorage.setItem(KEYS.actions,JSON.stringify({
      completed:[],
      updatedAt:new Date().toISOString()
    }));
    render();
  }

  function init() {
    if (!byId("executiveOperationalIntelligence")) return;

    byId("executiveMorningCopyBrief")?.addEventListener("click",copyBrief);
    byId("executiveMorningRefresh")?.addEventListener("click",render);
    byId("executiveClearCompletedActions")?.addEventListener("click",clearCompleted);

    [
      "bluecurrent:incident-acknowledged",
      "bluecurrent:incident-resolved",
      "bluecurrent:executive-decision-approved",
      "bluecurrent:decision-outcome-recorded",
      "bluecurrent:retraining-plan-created",
      "bluecurrent:executive-replay-session-saved"
    ].forEach(name => window.addEventListener(name,render));

    window.addEventListener("storage",event => {
      if (Object.values(KEYS).includes(event.key)) render();
    });

    render();
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded",init,{once:true})
    : init();
})();