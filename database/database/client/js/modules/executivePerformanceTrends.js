(() => {
  "use strict";

  const STORAGE_KEY = "blueCurrent.executiveReplayAnalytics.v34.0.14.2";
  const byId = id => document.getElementById(id);

  let sessions = [];
  let lastAnalysis = null;

  function readSessions() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
      return (Array.isArray(stored.savedSessions) ? stored.savedSessions : [])
        .slice()
        .sort((a,b) => new Date(a.savedAt || 0) - new Date(b.savedAt || 0));
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
      bookmarks:Number(saved.bookmarks ?? session?.bookmarks?.length ?? 0)
    };
  }

  function avg(values) {
    return values.length
      ? Math.round(values.reduce((sum,value) => sum + value,0) / values.length)
      : 0;
  }

  function signed(value) {
    return value > 0 ? `+${value}` : String(value);
  }

  function analyze() {
    const rows = sessions.map(session => ({
      session,
      metrics:metrics(session)
    }));

    if (!rows.length) {
      return {
        rows,
        averageScore:0,
        scoreChange:0,
        criticalChange:0,
        outcomeChange:0,
        trendScore:0,
        direction:"No data",
        driver:"No data",
        consistency:0,
        focus:"Save more shifts",
        title:"No trend available",
        detail:"Save replay sessions over multiple shifts to identify recurring performance patterns."
      };
    }

    const first = rows[0].metrics;
    const latest = rows[rows.length - 1].metrics;
    const averageScore = avg(rows.map(row => row.metrics.score));
    const scoreChange = latest.score - first.score;
    const criticalChange = latest.critical - first.critical;
    const outcomeChange = latest.outcomes - first.outcomes;

    const quality =
      scoreChange +
      outcomeChange * 4 -
      criticalChange * 6;

    const trendScore = Math.max(0,Math.min(100,50 + quality));
    const direction = quality > 3 ? "Improving" : quality < -3 ? "Declining" : "Stable";

    let driver = "Session score stability";
    if (Math.abs(criticalChange * -6) >= Math.abs(scoreChange) && criticalChange !== 0) {
      driver = criticalChange < 0 ? "Fewer critical events" : "More critical events";
    } else if (outcomeChange !== 0) {
      driver = outcomeChange > 0 ? "More measured outcomes" : "Fewer measured outcomes";
    } else if (scoreChange !== 0) {
      driver = scoreChange > 0 ? "Higher session scores" : "Lower session scores";
    }

    const deviations = rows.map(row => Math.abs(row.metrics.score - averageScore));
    const consistency = Math.max(0,Math.min(100,100-avg(deviations)*3));

    const focus =
      criticalChange > 0 ? "Reduce critical-event frequency" :
      scoreChange < 0 ? "Review declining session score" :
      outcomeChange > 0 ? "Scale successful decisions" :
      consistency < 70 ? "Improve shift consistency" :
      "Maintain operating discipline";

    const title =
      direction === "Improving"
        ? "Saved shifts show improving performance."
        : direction === "Declining"
          ? "Saved shifts show declining performance."
          : "Saved shifts remain broadly stable.";

    const detail =
      `Average session score is ${averageScore}. From the first saved shift to the latest, score changed ${signed(scoreChange)}, critical events changed ${signed(criticalChange)}, and outcomes changed ${signed(outcomeChange)}.`;

    return {
      rows,
      averageScore,
      scoreChange,
      criticalChange,
      outcomeChange,
      trendScore,
      direction,
      driver,
      consistency,
      focus,
      title,
      detail
    };
  }

  function renderChart(analysis) {
    const root = byId("executivePerformanceTrendChart");
    root.replaceChildren();

    if (!analysis.rows.length) {
      const empty = document.createElement("div");
      empty.className = "executive-performance-trend-empty";
      empty.textContent = "Saved replay sessions will appear here as a performance trajectory.";
      root.append(empty);
      return;
    }

    analysis.rows.forEach((row,index) => {
      const item = document.createElement("article");
      item.className = "executive-performance-trend-bar";
      item.innerHTML = "<i></i><strong></strong><span></span>";
      item.querySelector("i").style.height = `${Math.max(4,row.metrics.score)}%`;
      item.querySelector("strong").textContent = String(row.metrics.score);
      item.querySelector("span").textContent = `Shift ${index + 1}`;
      item.title = `${row.session.title || `Shift ${index + 1}`} · ${row.metrics.score} score`;
      root.append(item);
    });
  }

  function renderTable(analysis) {
    const root = byId("executivePerformanceTrendTable");
    root.replaceChildren();

    if (!analysis.rows.length) {
      const empty = document.createElement("div");
      empty.className = "executive-performance-trend-empty";
      empty.textContent = "No saved replay sessions are available.";
      root.append(empty);
      return;
    }

    const header = document.createElement("div");
    header.className = "executive-performance-trend-row executive-performance-trend-header";
    ["Shift","Score","Decisions","Outcomes","Critical","Bookmarks"].forEach(label => {
      const cell = document.createElement("span");
      cell.textContent = label;
      header.append(cell);
    });
    root.append(header);

    analysis.rows.forEach((row,index) => {
      const item = document.createElement("div");
      item.className = "executive-performance-trend-row";

      const title = document.createElement("span");
      title.textContent = row.session.title || `Shift ${index + 1}`;

      [
        row.metrics.score,
        row.metrics.decisions,
        row.metrics.outcomes,
        row.metrics.critical,
        row.metrics.bookmarks
      ].forEach(value => {
        const cell = document.createElement("strong");
        cell.textContent = String(value);
        item.append(cell);
      });

      item.prepend(title);
      root.append(item);
    });
  }

  function render() {
    sessions = readSessions();
    const analysis = analyze();
    lastAnalysis = analysis;

    byId("executiveTrendShiftCount").textContent = String(analysis.rows.length);
    byId("executiveTrendAverageScore").textContent = String(analysis.averageScore);
    byId("executiveTrendScoreChange").textContent = signed(analysis.scoreChange);
    byId("executiveTrendCriticalChange").textContent = signed(analysis.criticalChange);
    byId("executiveTrendOutcomeChange").textContent = signed(analysis.outcomeChange);

    byId("executivePerformanceTrendScore").textContent = String(analysis.trendScore);
    byId("executivePerformanceTrendLabel").textContent =
      analysis.direction === "Improving" ? "Improving trend" :
      analysis.direction === "Declining" ? "Declining trend" :
      analysis.rows.length ? "Stable trend" : "Awaiting sessions";
    byId("executivePerformanceTrendScoreCard").dataset.tone =
      analysis.trendScore >= 58 ? "stable" :
      analysis.trendScore <= 42 && analysis.rows.length ? "risk" : "watch";

    byId("executiveTrendInsightTitle").textContent = analysis.title;
    byId("executiveTrendInsightDetail").textContent = analysis.detail;
    byId("executiveTrendDirection").textContent = analysis.direction;
    byId("executiveTrendPrimaryDriver").textContent = analysis.driver;
    byId("executiveTrendConsistency").textContent = `${analysis.consistency}%`;
    byId("executiveTrendFocus").textContent = analysis.focus;

    byId("executiveTrendWindowLabel").textContent =
      `${analysis.rows.length} shift${analysis.rows.length === 1 ? "" : "s"}`;
    byId("executiveTrendHistoryCount").textContent =
      `${analysis.rows.length} record${analysis.rows.length === 1 ? "" : "s"}`;
    byId("executivePerformanceTrendsUpdated").textContent =
      analysis.rows.length
        ? `Updated ${new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit"}).format(new Date())}.`
        : "Save replay sessions over multiple shifts to begin trend analysis.";

    renderChart(analysis);
    renderTable(analysis);
  }

  function copyBrief() {
    if (!lastAnalysis || !lastAnalysis.rows.length) {
      byId("executiveTrendStatus").textContent =
        "Save at least one replay session before copying the trend brief.";
      return;
    }

    const a = lastAnalysis;
    const text = [
      "Blue Current Executive Performance Trend Brief",
      `Saved shifts: ${a.rows.length}`,
      `Average session score: ${a.averageScore}`,
      `Direction: ${a.direction}`,
      `Primary driver: ${a.driver}`,
      `Consistency: ${a.consistency}%`,
      `Score change: ${signed(a.scoreChange)}`,
      `Critical-event change: ${signed(a.criticalChange)}`,
      `Outcome change: ${signed(a.outcomeChange)}`,
      `Recommended focus: ${a.focus}`,
      "",
      a.detail
    ].join("\n");

    navigator.clipboard?.writeText(text).then(() => {
      byId("executiveTrendStatus").textContent = "Trend brief copied.";
    }).catch(() => {
      byId("executiveTrendStatus").textContent =
        "Copy unavailable in this browser.";
    });
  }

  function init() {
    if (!byId("executivePerformanceTrends")) return;

    byId("executiveTrendRefresh")?.addEventListener("click",render);
    byId("executiveTrendCopyBrief")?.addEventListener("click",copyBrief);

    window.addEventListener("bluecurrent:executive-replay-session-saved",render);
    window.addEventListener("storage",event => {
      if (event.key === STORAGE_KEY) render();
    });

    render();
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded",init,{once:true})
    : init();
})();