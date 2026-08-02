(() => {
  "use strict";

  const STORAGE_KEY = "blueCurrent.executiveReplayAnalytics.v34.0.14.2";
  const byId = id => document.getElementById(id);

  const state = {
    current:null,
    previousSnapshot:null,
    bookmarks:[],
    savedSessions:[]
  };

  function load() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
      state.bookmarks = Array.isArray(stored.bookmarks) ? stored.bookmarks : [];
      state.savedSessions = Array.isArray(stored.savedSessions) ? stored.savedSessions : [];
    } catch {
      state.bookmarks = [];
      state.savedSessions = [];
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY,JSON.stringify({
      bookmarks:state.bookmarks,
      savedSessions:state.savedSessions
    }));
  }

  function formatDelta(value) {
    return value > 0 ? `+${value}` : String(value);
  }

  function commentary(current,snapshot,delta) {
    if (!current) {
      return {
        title:"No event selected",
        detail:"Playback analytics appear as events are revealed."
      };
    }

    if (current.severity === "critical") {
      return {
        title:`Critical pause: ${current.title}`,
        detail:`Playback paused automatically. Session score changed ${formatDelta(delta.score)} and critical exposure changed ${formatDelta(delta.critical)}.`
      };
    }

    if (current.type === "decision") {
      return {
        title:`Decision point: ${current.title}`,
        detail:`Leadership had ${snapshot.decisions} visible decision${snapshot.decisions === 1 ? "" : "s"} at this point in the session.`
      };
    }

    if (current.type === "outcome") {
      return {
        title:`Outcome confirmed: ${current.title}`,
        detail:`Measured outcomes increased ${formatDelta(delta.outcomes)} and the reconstructed session score changed ${formatDelta(delta.score)}.`
      };
    }

    return {
      title:current.title,
      detail:`At ${current.time}, the session score was ${snapshot.score} with ${snapshot.critical} critical event${snapshot.critical === 1 ? "" : "s"} visible.`
    };
  }

  function renderBookmarks() {
    const root = byId("executivePlaybackBookmarkList");
    root.replaceChildren();

    if (!state.bookmarks.length) {
      const empty = document.createElement("div");
      empty.className = "executive-playback-bookmark-empty";
      empty.textContent = "Bookmark important replay moments for executive review.";
      root.append(empty);
      byId("executivePlaybackBookmarkCount").textContent = "0 bookmarks";
      return;
    }

    state.bookmarks.forEach(bookmark => {
      const item = document.createElement("article");
      item.className = "executive-playback-bookmark";
      item.innerHTML = "<div><strong></strong><span></span></div><button type='button'>Jump</button>";
      item.querySelector("strong").textContent = bookmark.title;
      item.querySelector("span").textContent = `${bookmark.time} · Position ${bookmark.position}`;
      item.querySelector("button").addEventListener("click",() => {
        const range = byId("executivePlaybackRange");
        range.value = String(bookmark.position);
        range.dispatchEvent(new Event("input",{bubbles:true}));
      });
      root.append(item);
    });

    byId("executivePlaybackBookmarkCount").textContent =
      `${state.bookmarks.length} bookmark${state.bookmarks.length === 1 ? "" : "s"}`;
  }

  function onPosition(event) {
    const detail = event.detail || {};
    const snapshot = detail.snapshot || {decisions:0,outcomes:0,critical:0,score:100};
    const previous = state.previousSnapshot || {decisions:0,outcomes:0,critical:0,score:100};

    const delta = {
      decisions:snapshot.decisions - previous.decisions,
      outcomes:snapshot.outcomes - previous.outcomes,
      critical:snapshot.critical - previous.critical,
      score:snapshot.score - previous.score
    };

    state.current = {
      position:Number(detail.position || 0),
      total:Number(detail.total || 0),
      event:detail.current,
      snapshot,
      delta
    };
    state.previousSnapshot = {...snapshot};

    const text = commentary(detail.current,snapshot,delta);
    byId("executivePlaybackAnalyticsTitle").textContent = text.title;
    byId("executivePlaybackAnalyticsDetail").textContent = text.detail;
    byId("executivePlaybackScoreDelta").textContent = formatDelta(delta.score);
    byId("executivePlaybackDecisionDelta").textContent = formatDelta(delta.decisions);
    byId("executivePlaybackOutcomeDelta").textContent = formatDelta(delta.outcomes);
    byId("executivePlaybackCriticalDelta").textContent = formatDelta(delta.critical);
    byId("executivePlaybackBookmark").disabled = !detail.current;
  }

  function addBookmark() {
    if (!state.current?.event) return;

    const bookmark = {
      id:`bookmark_${Date.now()}`,
      position:state.current.position,
      title:state.current.event.title,
      time:state.current.event.time,
      severity:state.current.event.severity,
      createdAt:new Date().toISOString()
    };

    const duplicate = state.bookmarks.find(item =>
      item.position === bookmark.position && item.title === bookmark.title
    );
    if (!duplicate) {
      state.bookmarks.push(bookmark);
      save();
      renderBookmarks();
    }
  }

  function saveSession() {
    const session = {
      id:`session_${Date.now()}`,
      title:`Executive replay ${new Date().toLocaleDateString()}`,
      savedAt:new Date().toISOString(),
      position:state.current?.position || 0,
      total:state.current?.total || 0,
      snapshot:state.current?.snapshot || null,
      bookmarks:[...state.bookmarks]
    };

    state.savedSessions.push(session);
    state.savedSessions = state.savedSessions.slice(-20);
    save();

    byId("executiveTimelineStatus").textContent =
      `Replay saved with ${session.bookmarks.length} bookmark${session.bookmarks.length === 1 ? "" : "s"}.`;
  }

  function init() {
    if (!byId("executiveSessionPlayback")) return;

    load();
    renderBookmarks();

    byId("executivePlaybackBookmark")?.addEventListener("click",addBookmark);
    byId("executivePlaybackSaveSession")?.addEventListener("click",saveSession);

    window.addEventListener("bluecurrent:executive-playback-position-changed",onPosition);
    window.addEventListener("bluecurrent:executive-playback-critical-pause",event => {
      const title = event.detail?.event?.title || "Critical event";
      byId("executiveTimelineStatus").textContent =
        `Playback paused automatically at ${title}.`;
    });

    document.addEventListener("keydown",event => {
      if (event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLTextAreaElement ||
          event.target instanceof HTMLSelectElement) return;

      if (event.code === "Space") {
        event.preventDefault();
        const pause = byId("executivePlaybackPause");
        const start = byId("executivePlaybackStart");
        if (!pause.disabled) pause.click();
        else if (!start.disabled) start.click();
      }

      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        const range = byId("executivePlaybackRange");
        const current = Number(range.value || 0);
        const next = event.key === "ArrowRight"
          ? Math.min(Number(range.max || 0),current + 1)
          : Math.max(0,current - 1);
        range.value = String(next);
        range.dispatchEvent(new Event("input",{bubbles:true}));
      }

      if (event.key.toLowerCase() === "b" && !byId("executivePlaybackBookmark").disabled) {
        addBookmark();
      }
    });
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded",init,{once:true})
    : init();
})();