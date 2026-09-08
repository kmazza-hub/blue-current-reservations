(() => {
  "use strict";

  const ACCOUNTABILITY_KEY = "blueCurrent.executiveAccountabilityCenter.v34.0.14.6";
  const INTELLIGENCE_KEY = "blueCurrent.executiveOperationalIntelligence.v34.0.14.5";
  const HISTORY_KEY = "blueCurrent.aiOperationsCoach.v34.0.14.7";
  const byId = id => document.getElementById(id);

  let lastAnalysis = null;

  function read(key) {
    try { return JSON.parse(localStorage.getItem(key)) || {}; }
    catch { return {}; }
  }

  function analyze() {
    const accountability = read(ACCOUNTABILITY_KEY);
    const intelligence = read(INTELLIGENCE_KEY);
    const commitments = Array.isArray(accountability.commitments) ? accountability.commitments : [];
    const completed = commitments.filter(item => item.status === "completed");
    const verified = commitments.filter(item => item.status === "verified");
    const open = commitments.filter(item => !["completed","verified"].includes(item.status));

    const dueSoon = open.filter(item => {
      const due = new Date(item.dueAt || 0).getTime();
      return due && due >= Date.now() && due-Date.now() <= 24*3600000;
    });

    const overdue = open.filter(item => new Date(item.dueAt || 0).getTime() < Date.now());
    const escalated = commitments.filter(item => item.escalatedAt);

    const ownerCounts = commitments.reduce((map,item) => {
      map[item.owner || "Unassigned"] = (map[item.owner || "Unassigned"] || 0) + 1;
      return map;
    }, {});
    const primaryOwner = Object.entries(ownerCounts).sort((a,b) => b[1]-a[1])[0]?.[0] || "Leadership team";

    const lessons = [];
    if (overdue.length) {
      lessons.push({
        tone:"risk",
        title:"Tighten follow-through on overdue commitments",
        detail:`${overdue.length} commitment${overdue.length === 1 ? "" : "s"} missed the due date. Start each management meeting by assigning a recovery owner and a new deadline.`
      });
    }
    if (dueSoon.length) {
      lessons.push({
        tone:"watch",
        title:"Protect the next 24-hour execution window",
        detail:`${dueSoon.length} commitment${dueSoon.length === 1 ? "" : "s"} are due soon. Confirm blockers, ownership, and expected proof of completion before service.`
      });
    }
    if (verified.length) {
      lessons.push({
        tone:"stable",
        title:"Convert verified wins into operating standards",
        detail:`${verified.length} verified result${verified.length === 1 ? "" : "s"} can be documented as repeatable best practices and coached across shifts.`
      });
    }
    if (escalated.length) {
      lessons.push({
        tone:"risk",
        title:"Reduce escalation dependency",
        detail:`${escalated.length} commitment${escalated.length === 1 ? "" : "s"} required escalation. Coach managers to identify risk earlier and request support before deadlines slip.`
      });
    }
    if (!lessons.length) {
      lessons.push({
        tone:"stable",
        title:"Maintain disciplined management cadence",
        detail:"No urgent coaching gaps are visible. Continue assigning clear owners, deadlines, and measurable proof of completion."
      });
    }

    const patterns = [];
    if (primaryOwner !== "Leadership team") {
      patterns.push({
        tone:"watch",
        title:`Work is concentrated with ${primaryOwner}`,
        detail:"Review whether commitments should be redistributed to avoid bottlenecks and strengthen manager ownership."
      });
    }
    if (verified.length >= 2) {
      patterns.push({
        tone:"stable",
        title:"Verification discipline is improving",
        detail:"Multiple completed actions now include measured proof, which strengthens learning and accountability."
      });
    }
    if (completed.length > verified.length) {
      patterns.push({
        tone:"watch",
        title:"Completion is outpacing verification",
        detail:`${completed.length} completed action${completed.length === 1 ? "" : "s"} still need verified results before they can become trusted best practices.`
      });
    }
    if (!patterns.length) {
      patterns.push({
        tone:"stable",
        title:"No harmful management pattern detected",
        detail:"Current accountability behavior is broadly balanced across ownership, completion, and verification."
      });
    }

    const riskCount = dueSoon.length + overdue.length;
    const score = Math.max(0,Math.min(100,
      70 + verified.length*6 - overdue.length*15 - dueSoon.length*5 - escalated.length*4
    ));
    const confidence = Math.max(55,Math.min(97,
      58 + commitments.length*3 + verified.length*4
    ));

    const managerFocus =
      overdue.length ? "Follow-through" :
      completed.length > verified.length ? "Verification" :
      verified.length ? "Standardization" : "Ownership";

    const sessionTitle =
      overdue.length ? "Recovery and commitment discipline session" :
      completed.length > verified.length ? "Verification and proof session" :
      verified.length ? "Best-practice scaling session" :
      "Ownership and execution fundamentals";

    const sessionDetail =
      overdue.length
        ? "Review overdue commitments, identify the first failure point, and assign a specific recovery step with a same-day proof requirement."
        : completed.length > verified.length
          ? "Review completed commitments and define the measurable evidence required before each action can be considered successful."
          : verified.length
            ? "Select the strongest verified result and coach managers on how to reproduce the behavior across the next three shifts."
            : "Coach managers to write commitments with one owner, one deadline, and one measurable outcome.";

    return {
      commitments,completed,verified,open,dueSoon,overdue,escalated,
      primaryOwner,lessons,patterns,riskCount,score,confidence,managerFocus,
      sessionTitle,sessionDetail
    };
  }

  function renderCards(rootId,items,countId) {
    const root = byId(rootId);
    root.replaceChildren();

    items.forEach(item => {
      const card = document.createElement("article");
      card.className = "ai-operations-coach-card";
      card.dataset.tone = item.tone;
      card.innerHTML = "<strong></strong><span></span>";
      card.querySelector("strong").textContent = item.title;
      card.querySelector("span").textContent = item.detail;
      root.append(card);
    });

    byId(countId).textContent =
      `${items.length} ${items.length === 1 ? "item" : "items"}`;
  }

  function renderHistory() {
    const stored = read(HISTORY_KEY);
    const history = Array.isArray(stored.history) ? stored.history : [];
    const root = byId("aiOperationsCoachHistoryList");
    root.replaceChildren();

    if (!history.length) {
      const empty = document.createElement("div");
      empty.className = "ai-operations-coach-empty";
      empty.textContent = "Created coaching sessions will appear here.";
      root.append(empty);
      return;
    }

    history.slice().reverse().forEach(entry => {
      const item = document.createElement("article");
      item.className = "ai-operations-coach-history-item";
      item.innerHTML = "<div><strong></strong><span></span></div><time></time>";
      item.querySelector("strong").textContent = entry.title;
      item.querySelector("span").textContent =
        `${entry.audience} · ${entry.goal} · Score ${entry.score}`;
      item.querySelector("time").textContent =
        new Date(entry.createdAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"});
      root.append(item);
    });
  }

  function render() {
    const a = analyze();
    lastAnalysis = a;

    byId("aiOperationsCoachScore").textContent = String(a.score);
    byId("aiOperationsCoachLabel").textContent =
      a.score >= 85 ? "Ready to scale wins" :
      a.score >= 65 ? "Targeted coaching needed" : "Immediate coaching required";
    byId("aiOperationsCoachScoreCard").dataset.tone =
      a.score >= 85 ? "stable" : a.score >= 65 ? "watch" : "risk";

    byId("aiOperationsCoachLessonCount").textContent = String(a.lessons.length);
    byId("aiOperationsCoachRiskCount").textContent = String(a.riskCount);
    byId("aiOperationsCoachWinCount").textContent = String(a.verified.length);
    byId("aiOperationsCoachManagerFocus").textContent = a.managerFocus;
    byId("aiOperationsCoachConfidence").textContent = `${a.confidence}%`;

    renderCards("aiOperationsCoachLessonList",a.lessons,"aiOperationsCoachLessonLabel");
    renderCards("aiOperationsCoachPatternList",a.patterns,"aiOperationsCoachPatternCount");

    byId("aiOperationsCoachSessionTitle").textContent = a.sessionTitle;
    byId("aiOperationsCoachSessionDetail").textContent = a.sessionDetail;
    byId("aiOperationsCoachAudience").textContent = a.primaryOwner;
    byId("aiOperationsCoachDuration").textContent =
      a.overdue.length ? "20 minutes" : a.riskCount ? "15 minutes" : "10 minutes";
    byId("aiOperationsCoachGoal").textContent = a.managerFocus;
    byId("aiOperationsCoachReviewWindow").textContent =
      a.overdue.length ? "Before next shift" : "Within 48 hours";
    byId("aiOperationsCoachUpdated").textContent =
      `Updated ${new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit"}).format(new Date())}.`;

    renderHistory();
  }

  function createSession() {
    if (!lastAnalysis) return;

    const stored = read(HISTORY_KEY);
    const history = Array.isArray(stored.history) ? stored.history : [];

    const session = {
      id:`coach_${Date.now()}`,
      title:lastAnalysis.sessionTitle,
      audience:lastAnalysis.primaryOwner,
      goal:lastAnalysis.managerFocus,
      score:lastAnalysis.score,
      lessons:lastAnalysis.lessons,
      createdAt:new Date().toISOString()
    };

    history.push(session);
    localStorage.setItem(HISTORY_KEY,JSON.stringify({history}));
    byId("aiOperationsCoachStatus").textContent = "Coaching session saved.";
    renderHistory();

    window.dispatchEvent(new CustomEvent("bluecurrent:ai-coaching-session-created", {
      detail:{session}
    }));
  }

  function copyBrief() {
    if (!lastAnalysis) return;
    const a = lastAnalysis;
    const text = [
      "Blue Current AI Operations Coaching Brief",
      `Coaching readiness: ${a.score}`,
      `Audience: ${a.primaryOwner}`,
      `Manager focus: ${a.managerFocus}`,
      `At-risk commitments: ${a.riskCount}`,
      `Verified wins: ${a.verified.length}`,
      "",
      a.sessionTitle,
      a.sessionDetail,
      "",
      "Coaching lessons:",
      ...a.lessons.map((lesson,index) => `${index+1}. ${lesson.title}: ${lesson.detail}`)
    ].join("\n");

    navigator.clipboard?.writeText(text).then(() => {
      byId("aiOperationsCoachStatus").textContent = "Coaching brief copied.";
    }).catch(() => {
      byId("aiOperationsCoachStatus").textContent = "Copy unavailable in this browser.";
    });
  }

  function init() {
    if (!byId("aiOperationsCoach")) return;

    byId("aiOperationsCoachCreateSession")?.addEventListener("click",createSession);
    byId("aiOperationsCoachCopyBrief")?.addEventListener("click",copyBrief);
    byId("aiOperationsCoachClearHistory")?.addEventListener("click",() => {
      localStorage.setItem(HISTORY_KEY,JSON.stringify({history:[]}));
      renderHistory();
    });

    window.addEventListener("storage",event => {
      if ([ACCOUNTABILITY_KEY,INTELLIGENCE_KEY,HISTORY_KEY].includes(event.key)) render();
    });

    render();
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded",init,{once:true})
    : init();
})();