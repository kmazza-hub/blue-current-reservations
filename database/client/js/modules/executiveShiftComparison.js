(() => {
  "use strict";

  const STORAGE_KEY = "blueCurrent.executiveReplayAnalytics.v34.0.14.2";
  const byId = id => document.getElementById(id);

  const state = {
    sessions:[],
    baselineId:null,
    candidateId:null,
    lastComparison:null
  };

  function readSessions() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
      return Array.isArray(stored.savedSessions) ? stored.savedSessions : [];
    } catch {
      return [];
    }
  }

  function metrics(session) {
    const snapshot = session?.snapshot || {};
    const saved = session?.metrics || {};
    return {
      score:Number(saved.score ?? snapshot.score ?? 100),
      decisions:Number(saved.decisions ?? snapshot.decisions ?? 0),
      outcomes:Number(saved.outcomes ?? snapshot.outcomes ?? 0),
      critical:Number(saved.critical ?? snapshot.critical ?? 0),
      bookmarks:Number(saved.bookmarks ?? session?.bookmarks?.length ?? 0),
      total:Number(session?.total || 0)
    };
  }

  function formatDate(value) {
    return value
      ? new Date(value).toLocaleString([], {
          month:"short",
          day:"numeric",
          hour:"numeric",
          minute:"2-digit"
        })
      : "Unknown session";
  }

  function optionLabel(session,index) {
    return `${session.title || `Replay ${index + 1}`} · ${formatDate(session.savedAt)}`;
  }

  function populateSelects() {
    const baseline = byId("executiveShiftBaseline");
    const candidate = byId("executiveShiftCandidate");
    baseline.replaceChildren();
    candidate.replaceChildren();

    state.sessions.forEach((session,index) => {
      const a = document.createElement("option");
      a.value = session.id;
      a.textContent = optionLabel(session,index);
      baseline.append(a);

      const b = document.createElement("option");
      b.value = session.id;
      b.textContent = optionLabel(session,index);
      candidate.append(b);
    });

    if (state.sessions.length) {
      state.baselineId = state.baselineId || state.sessions[0].id;
      state.candidateId = state.candidateId ||
        state.sessions[Math.min(1,state.sessions.length - 1)].id;
      baseline.value = state.baselineId;
      candidate.value = state.candidateId;
    }

    byId("executiveShiftComparisonSessionCount").textContent =
      `${state.sessions.length} saved session${state.sessions.length === 1 ? "" : "s"}`;
  }

  function sessionById(id) {
    return state.sessions.find(session => session.id === id) || null;
  }

  function delta(candidate,baseline) {
    return candidate - baseline;
  }

  function signed(value) {
    return value > 0 ? `+${value}` : String(value);
  }

  function confidence(base,candidate) {
    const depth = Math.min(20,(base.total + candidate.total) / 2);
    return Math.max(60,Math.min(96,Math.round(68 + depth)));
  }

  function compare() {
    const baselineSession = sessionById(byId("executiveShiftBaseline").value);
    const candidateSession = sessionById(byId("executiveShiftCandidate").value);

    if (!baselineSession || !candidateSession) {
      byId("executiveShiftComparisonStatus").textContent =
        "Save at least two replay sessions before comparing shifts.";
      return;
    }

    const base = metrics(baselineSession);
    const candidate = metrics(candidateSession);

    const changes = {
      score:delta(candidate.score,base.score),
      decisions:delta(candidate.decisions,base.decisions),
      outcomes:delta(candidate.outcomes,base.outcomes),
      critical:delta(candidate.critical,base.critical),
      bookmarks:delta(candidate.bookmarks,base.bookmarks)
    };

    const qualityDelta =
      changes.score +
      changes.outcomes * 4 -
      changes.critical * 5 +
      Math.min(4,changes.decisions);

    const comparisonScore = Math.max(0,Math.min(100,50 + qualityDelta));
    const stronger = qualityDelta > 2
      ? "Comparison shift"
      : qualityDelta < -2
        ? "Baseline shift"
        : "Even performance";

    let driver = "Balanced performance";
    if (Math.abs(changes.critical * -5) >= Math.abs(changes.score) &&
        changes.critical !== 0) {
      driver = changes.critical < 0 ? "Fewer critical events" : "More critical events";
    } else if (changes.outcomes !== 0) {
      driver = changes.outcomes > 0 ? "More measured outcomes" : "Fewer measured outcomes";
    } else if (changes.score !== 0) {
      driver = changes.score > 0 ? "Higher session score" : "Lower session score";
    }

    const title = qualityDelta > 2
      ? "The comparison shift performed better."
      : qualityDelta < -2
        ? "The baseline shift performed better."
        : "The shifts performed similarly.";

    const detail =
      `Session score changed ${signed(changes.score)}, critical events changed ${signed(changes.critical)}, and measured outcomes changed ${signed(changes.outcomes)}. ${driver} was the primary differentiator.`;

    const review = changes.critical > 0
      ? "Review critical-event causes"
      : changes.score < 0
        ? "Review score decline"
        : changes.outcomes > 0
          ? "Study successful outcomes"
          : "Review bookmarked moments";

    state.lastComparison = {
      baselineSession,
      candidateSession,
      base,
      candidate,
      changes,
      comparisonScore,
      stronger,
      driver,
      confidence:confidence(base,candidate),
      title,
      detail,
      review
    };

    byId("executiveShiftComparisonScore").textContent = String(comparisonScore);
    byId("executiveShiftComparisonLabel").textContent =
      comparisonScore >= 58 ? "Comparison improved" :
      comparisonScore <= 42 ? "Comparison declined" : "Comparable shifts";
    byId("executiveShiftComparisonScoreCard").dataset.tone =
      comparisonScore >= 58 ? "stable" :
      comparisonScore <= 42 ? "risk" : "watch";

    const setDelta = (id,value) => {
      byId(id).textContent = signed(value);
    };

    setDelta("executiveShiftScoreDelta",changes.score);
    setDelta("executiveShiftDecisionDelta",changes.decisions);
    setDelta("executiveShiftOutcomeDelta",changes.outcomes);
    setDelta("executiveShiftCriticalDelta",changes.critical);
    setDelta("executiveShiftBookmarkDelta",changes.bookmarks);

    byId("executiveShiftScoreDetail").textContent =
      `${base.score} → ${candidate.score}`;
    byId("executiveShiftDecisionDetail").textContent =
      `${base.decisions} → ${candidate.decisions}`;
    byId("executiveShiftOutcomeDetail").textContent =
      `${base.outcomes} → ${candidate.outcomes}`;
    byId("executiveShiftCriticalDetail").textContent =
      `${base.critical} → ${candidate.critical}`;
    byId("executiveShiftBookmarkDetail").textContent =
      `${base.bookmarks} → ${candidate.bookmarks}`;

    const fields = {
      executiveShiftBaselineScore:base.score,
      executiveShiftCandidateScore:candidate.score,
      executiveShiftTableScoreDelta:signed(changes.score),
      executiveShiftBaselineDecisions:base.decisions,
      executiveShiftCandidateDecisions:candidate.decisions,
      executiveShiftTableDecisionDelta:signed(changes.decisions),
      executiveShiftBaselineOutcomes:base.outcomes,
      executiveShiftCandidateOutcomes:candidate.outcomes,
      executiveShiftTableOutcomeDelta:signed(changes.outcomes),
      executiveShiftBaselineCritical:base.critical,
      executiveShiftCandidateCritical:candidate.critical,
      executiveShiftTableCriticalDelta:signed(changes.critical),
      executiveShiftBaselineBookmarks:base.bookmarks,
      executiveShiftCandidateBookmarks:candidate.bookmarks,
      executiveShiftTableBookmarkDelta:signed(changes.bookmarks)
    };

    Object.entries(fields).forEach(([id,value]) => {
      byId(id).textContent = String(value);
    });

    byId("executiveShiftComparisonInsightTitle").textContent = title;
    byId("executiveShiftComparisonInsightDetail").textContent = detail;
    byId("executiveShiftStronger").textContent = stronger;
    byId("executiveShiftDriver").textContent = driver;
    byId("executiveShiftConfidence").textContent =
      `${state.lastComparison.confidence}%`;
    byId("executiveShiftReview").textContent = review;
    byId("executiveShiftComparisonUpdated").textContent =
      `Compared ${formatDate(baselineSession.savedAt)} with ${formatDate(candidateSession.savedAt)}.`;
    byId("executiveShiftComparisonStatus").textContent = "";
  }

  function copyReport() {
    if (!state.lastComparison) {
      byId("executiveShiftComparisonStatus").textContent =
        "Run a shift comparison before copying the report.";
      return;
    }

    const item = state.lastComparison;
    const text = [
      "Blue Current Executive Shift Comparison",
      `Baseline: ${optionLabel(item.baselineSession,0)}`,
      `Comparison: ${optionLabel(item.candidateSession,1)}`,
      `Stronger shift: ${item.stronger}`,
      `Primary driver: ${item.driver}`,
      `Confidence: ${item.confidence}%`,
      `Session score: ${item.base.score} → ${item.candidate.score} (${signed(item.changes.score)})`,
      `Decisions: ${item.base.decisions} → ${item.candidate.decisions} (${signed(item.changes.decisions)})`,
      `Outcomes: ${item.base.outcomes} → ${item.candidate.outcomes} (${signed(item.changes.outcomes)})`,
      `Critical events: ${item.base.critical} → ${item.candidate.critical} (${signed(item.changes.critical)})`,
      `Bookmarks: ${item.base.bookmarks} → ${item.candidate.bookmarks} (${signed(item.changes.bookmarks)})`,
      "",
      item.detail
    ].join("\n");

    navigator.clipboard?.writeText(text).then(() => {
      byId("executiveShiftComparisonStatus").textContent =
        "Shift comparison report copied.";
    }).catch(() => {
      byId("executiveShiftComparisonStatus").textContent =
        "Copy unavailable in this browser.";
    });
  }

  function refresh() {
    state.sessions = readSessions();
    populateSelects();

    if (state.sessions.length >= 2) {
      compare();
    } else {
      byId("executiveShiftComparisonUpdated").textContent =
        "Save at least two replay sessions to compare operating performance.";
    }
  }

  function init() {
    if (!byId("executiveShiftComparison")) return;

    byId("executiveShiftBaseline")?.addEventListener("change",event => {
      state.baselineId = event.target.value;
    });

    byId("executiveShiftCandidate")?.addEventListener("change",event => {
      state.candidateId = event.target.value;
    });

    byId("executiveShiftCompare")?.addEventListener("click",compare);
    byId("executiveShiftCopyReport")?.addEventListener("click",copyReport);
    byId("executiveShiftOpenPlayback")?.addEventListener("click",() => {
      byId("executiveSessionPlayback")?.scrollIntoView({
        behavior:"smooth",
        block:"start"
      });
    });

    window.addEventListener("bluecurrent:executive-replay-session-saved",refresh);
    window.addEventListener("storage",event => {
      if (event.key === STORAGE_KEY) refresh();
    });

    refresh();
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded",init,{once:true})
    : init();
})();