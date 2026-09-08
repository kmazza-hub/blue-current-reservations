(() => {
  "use strict";

  const byId = id => document.getElementById(id);

  const state = {
    events:[],
    position:0,
    timer:null,
    playing:false
  };

  function timelineItems() {
    return Array.from(document.querySelectorAll("#executiveTimelineList .executive-timeline-item"));
  }

  function eventMeta(item) {
    const label = item.querySelector(".executive-timeline-copy small")?.textContent || "";
    const title = item.querySelector(".executive-timeline-copy strong")?.textContent || "";
    const time = item.querySelector(".executive-timeline-time")?.textContent || "—";
    const [type,severity] = label.split("·").map(value => value.trim().toLowerCase());

    return {
      item,
      type:type || "event",
      severity:severity || "info",
      title,
      time
    };
  }

  function refreshEvents() {
    state.events = timelineItems()
      .map(eventMeta)
      .reverse();

    const range = byId("executivePlaybackRange");
    range.max = String(Math.max(0,state.events.length));
    state.position = Math.min(state.position,state.events.length);
    range.value = String(state.position);
    render();
  }

  function sessionScore(visible) {
    const critical = visible.filter(event => event.severity === "critical").length;
    const outcomes = visible.filter(event => event.type === "outcome").length;
    return Math.max(0,Math.min(100,100-critical*8+outcomes*3));
  }

  function render() {
    const visible = state.events.slice(0,state.position);
    const visibleItems = new Set(visible.map(event => event.item));

    state.events.forEach(event => {
      event.item.classList.toggle("is-playback-hidden",!visibleItems.has(event.item));
    });

    byId("executivePlaybackPosition").textContent =
      `${state.position} of ${state.events.length} events`;

    const current = visible[visible.length-1];
    byId("executivePlaybackTime").textContent = current?.time || "—";
    byId("executivePlaybackTitle").textContent =
      current ? current.title : "Replay the operating session";
    byId("executivePlaybackDetail").textContent =
      current
        ? `Timeline reconstructed through ${current.time}.`
        : "Move through the timeline to review what leadership knew at each point.";

    const decisions = visible.filter(event => event.type === "decision").length;
    const outcomes = visible.filter(event => event.type === "outcome").length;
    const critical = visible.filter(event => event.severity === "critical").length;

    byId("executivePlaybackDecisions").textContent = String(decisions);
    byId("executivePlaybackOutcomes").textContent = String(outcomes);
    byId("executivePlaybackCritical").textContent = String(critical);
    const score = sessionScore(visible);
    byId("executivePlaybackScore").textContent = String(score);

    window.dispatchEvent(new CustomEvent("bluecurrent:executive-playback-position-changed", {
      detail:{
        position:state.position,
        total:state.events.length,
        current:current ? {
          type:current.type,
          severity:current.severity,
          title:current.title,
          time:current.time
        } : null,
        snapshot:{
          decisions,
          outcomes,
          critical,
          score
        }
      }
    }));

    const range = byId("executivePlaybackRange");
    range.value = String(state.position);

    byId("executivePlaybackStart").disabled =
      state.playing || state.position >= state.events.length || !state.events.length;
    byId("executivePlaybackPause").disabled = !state.playing;
  }

  function stop() {
    if (state.timer) {
      clearInterval(state.timer);
      state.timer = null;
    }
    state.playing = false;
    render();
  }

  function start() {
    if (!state.events.length || state.position >= state.events.length) return;

    stop();
    state.playing = true;
    render();

    const speed = Number(byId("executivePlaybackSpeed").value || 1500);
    state.timer = setInterval(() => {
      state.position += 1;
      const revealed = state.events[state.position - 1];
      render();

      if (revealed?.severity === "critical") {
        stop();
        window.dispatchEvent(new CustomEvent("bluecurrent:executive-playback-critical-pause", {
          detail:{event:revealed,position:state.position}
        }));
        return;
      }

      if (state.position >= state.events.length) {
        stop();
      }
    },speed);
  }

  function reset() {
    stop();
    state.position = 0;
    render();
  }

  function init() {
    if (!byId("executiveSessionPlayback")) return;

    byId("executivePlaybackStart")?.addEventListener("click",start);
    byId("executivePlaybackPause")?.addEventListener("click",stop);
    byId("executivePlaybackReset")?.addEventListener("click",reset);

    byId("executivePlaybackRange")?.addEventListener("input",event => {
      stop();
      state.position = Number(event.target.value || 0);
      render();
    });

    byId("executivePlaybackSpeed")?.addEventListener("change",() => {
      if (state.playing) start();
    });

    byId("executiveTimelineRefresh")?.addEventListener("click",() => {
      setTimeout(refreshEvents,0);
    });

    [
      "bluecurrent:incident-acknowledged",
      "bluecurrent:incident-resolved",
      "bluecurrent:executive-decision-approved",
      "bluecurrent:decision-outcome-recorded",
      "bluecurrent:retraining-plan-created"
    ].forEach(name => window.addEventListener(name,() => {
      setTimeout(refreshEvents,0);
    }));

    refreshEvents();
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded",init,{once:true})
    : init();
})();