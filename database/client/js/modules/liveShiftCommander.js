(() => {
  "use strict";

  const INCIDENT_KEY = "blueCurrent.incidentResponse.v34.0.6";
  const PLAYBOOK_KEY = "blueCurrent.serviceRecovery.v34.0.7";
  const FLOOR_KEY = "blueCurrent.liveFloorOperations.v35.0.3";
  const KITCHEN_KEY = "blueCurrent.kitchenExpo.v35.0.8";
  const byId = id => document.getElementById(id);

  function read(key) {
    try { return JSON.parse(localStorage.getItem(key)) || {}; }
    catch { return {}; }
  }

  function incidents() {
    const data = read(INCIDENT_KEY);
    return Array.isArray(data.incidents) ? data.incidents : [];
  }

  function playbooks() {
    const data = read(PLAYBOOK_KEY);
    return Array.isArray(data.runs) ? data.runs : [];
  }

  function activeTables() {
    const data = read(FLOOR_KEY);
    return Array.isArray(data.tables) ? data.tables : [];
  }

  function kitchenTickets() {
    const data = read(KITCHEN_KEY);
    return Array.isArray(data.tickets) ? data.tickets : [];
  }

  function collect() {
    const allIncidents = incidents();
    const open = allIncidents.filter(i => i.status === "open");
    const acknowledged = allIncidents.filter(i => i.status === "acknowledged");
    const resolved = allIncidents.filter(i => i.status === "resolved");
    const running = playbooks().filter(p => p.status === "running");
    const completed = playbooks().filter(p => p.status === "completed");
    const attention = activeTables().filter(t => t.status === "attention");
    const lateKitchen = kitchenTickets().filter(t => {
      const start = t.firedAt || t.createdAt;
      if (!start || t.status === "ready") return false;
      const age = (Date.now() - new Date(start).getTime()) / 60000;
      return age >= Number(t.target || 15);
    });

    const immediate = open.filter(i => i.severity === "critical").length + lateKitchen.filter(t => {
      const start = t.firedAt || t.createdAt;
      return (Date.now() - new Date(start).getTime()) / 60000 >= Number(t.target || 15) * 1.5;
    }).length;

    const soon = open.length + acknowledged.length + attention.length - immediate;
    const later = Math.max(0, running.length + (activeTables().length >= 8 ? 1 : 0));

    return {allIncidents,open,acknowledged,resolved,running,completed,attention,lateKitchen,immediate,soon,later};
  }

  function buildQueue(snapshot) {
    const queue = [];

    snapshot.open.forEach(item => queue.push({
      priority:item.severity === "critical" ? "immediate" : "soon",
      title:item.title,
      detail:item.detail,
      target:item.sourceTarget
    }));

    snapshot.acknowledged.forEach(item => queue.push({
      priority:"soon",
      title:`Follow through: ${item.title}`,
      detail:item.owner ? `Owned by ${item.owner}.` : "Assign an owner and complete recovery.",
      target:"missionIncidentCenter"
    }));

    snapshot.running.forEach(item => queue.push({
      priority:"later",
      title:`Continue ${item.title}`,
      detail:`Step ${Math.min(item.currentStep + 1,item.steps.length)} of ${item.steps.length}.`,
      target:"serviceRecoveryCenter"
    }));

    if (!queue.length) queue.push({
      priority:"later",
      title:"Maintain operating rhythm",
      detail:"No urgent action is required. Continue monitoring arrivals, floor flow, and kitchen pace.",
      target:"missionControl"
    });

    const rank = {immediate:0,soon:1,later:2};
    return queue.sort((a,b) => rank[a.priority] - rank[b.priority]);
  }

  function renderQueue(snapshot) {
    const queue = buildQueue(snapshot);
    const list = byId("liveShiftCommandQueue");
    list.replaceChildren();

    queue.forEach(item => {
      const row = document.createElement("article");
      row.className = "live-shift-command-item";
      row.dataset.priority = item.priority;

      const priority = document.createElement("span");
      priority.className = "live-shift-command-priority";
      priority.textContent =
        item.priority === "immediate" ? "Now" :
        item.priority === "soon" ? "Next 10" : "Later";

      const copy = document.createElement("div");
      copy.className = "live-shift-command-copy";
      copy.innerHTML = "<strong></strong><p></p>";
      copy.querySelector("strong").textContent = item.title;
      copy.querySelector("p").textContent = item.detail;

      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Open";
      button.addEventListener("click", () => {
        document.getElementById(item.target)?.scrollIntoView({behavior:"smooth",block:"start"});
      });

      row.append(priority,copy,button);
      list.append(row);
    });

    byId("liveShiftQueueCount").textContent = `${queue.length} item${queue.length === 1 ? "" : "s"}`;
  }

  function renderTimeline(snapshot) {
    const list = byId("liveShiftTimeline");
    list.replaceChildren();

    const now = new Date();
    const events = [
      [0,"Current service pulse",snapshot.open.length ? `${snapshot.open.length} incident${snapshot.open.length === 1 ? "" : "s"} open` : "Operation stable"],
      [15,"Arrival pressure review","Confirm host pacing and flexible table inventory"],
      [30,"Kitchen load checkpoint",snapshot.lateKitchen.length ? "Recovery required" : "Maintain current station balance"],
      [60,"Table-turn window","Review occupied tables and upcoming reservations"],
      [90,"Shift control review","Refresh command score and manager priorities"]
    ];

    events.forEach(([offset,title,detail]) => {
      const item = document.createElement("article");
      item.className = "live-shift-timeline-item";
      const time = document.createElement("time");
      time.textContent = new Date(now.getTime()+offset*60000).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"});
      const copy = document.createElement("div");
      copy.innerHTML = "<strong></strong><span></span>";
      copy.querySelector("strong").textContent = title;
      copy.querySelector("span").textContent = detail;
      item.append(time,copy);
      list.append(item);
    });
  }

  function renderGoals(snapshot) {
    const goals = [
      ["Incident response",Math.max(0,100 - snapshot.open.length*20)],
      ["Recovery completion",snapshot.resolved.length || snapshot.completed.length ? Math.min(100,60 + (snapshot.resolved.length + snapshot.completed.length)*10) : 72],
      ["Dining room flow",Math.max(0,100 - snapshot.attention.length*18)],
      ["Kitchen pacing",Math.max(0,100 - snapshot.lateKitchen.length*22)]
    ];

    const root = byId("liveShiftGoals");
    root.replaceChildren();

    goals.forEach(([label,value]) => {
      const item = document.createElement("div");
      item.className = "live-shift-goal";
      item.innerHTML = "<div class='live-shift-goal-head'><span></span><strong></strong></div><div class='live-shift-goal-track'><i></i></div>";
      item.querySelector("span").textContent = label;
      item.querySelector("strong").textContent = `${value}%`;
      item.querySelector("i").style.width = `${value}%`;
      root.append(item);
    });
  }

  function renderBrief(snapshot) {
    if (snapshot.immediate > 0) {
      byId("liveShiftBriefTitle").textContent = "Immediate intervention is required.";
      byId("liveShiftBriefDetail").textContent =
        `${snapshot.immediate} critical condition${snapshot.immediate === 1 ? "" : "s"} should be handled before the next arrival window.`;
    } else if (snapshot.open.length || snapshot.attention.length || snapshot.lateKitchen.length) {
      byId("liveShiftBriefTitle").textContent = "Pressure is building, but service remains recoverable.";
      byId("liveShiftBriefDetail").textContent =
        `Focus on ${snapshot.open.length || snapshot.attention.length || snapshot.lateKitchen.length} active exception${(snapshot.open.length || snapshot.attention.length || snapshot.lateKitchen.length) === 1 ? "" : "s"} and keep the next 30 minutes protected.`;
    } else {
      byId("liveShiftBriefTitle").textContent = "Service is stable.";
      byId("liveShiftBriefDetail").textContent =
        "No immediate intervention is required. Maintain pacing and monitor the next reservation wave.";
    }
  }

  function renderScore(snapshot) {
    let score = 100
      - snapshot.open.length * 12
      - snapshot.attention.length * 8
      - snapshot.lateKitchen.length * 10
      - snapshot.acknowledged.length * 4
      + snapshot.resolved.length * 3
      + snapshot.completed.length * 3;

    score = Math.max(0,Math.min(100,score));

    byId("liveShiftScore").textContent = String(score);
    byId("liveShiftScoreLabel").textContent =
      score >= 90 ? "Excellent control" :
      score >= 75 ? "Controlled pressure" :
      score >= 60 ? "Manager focus needed" : "Critical shift risk";

    const card = byId("liveShiftScoreCard");
    card.dataset.tone = score >= 85 ? "stable" : score >= 65 ? "watch" : "risk";

    byId("liveShiftImmediate").textContent = String(snapshot.immediate);
    byId("liveShiftTen").textContent = String(Math.max(0,snapshot.soon));
    byId("liveShiftThirty").textContent = String(snapshot.later);
    byId("liveShiftResolved").textContent = String(snapshot.resolved.length);
    byId("liveShiftPlaybooks").textContent = String(snapshot.completed.length);
  }

  function render() {
    const snapshot = collect();
    renderScore(snapshot);
    renderBrief(snapshot);
    renderQueue(snapshot);
    renderTimeline(snapshot);
    renderGoals(snapshot);
    byId("liveShiftUpdated").textContent =
      `Updated ${new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit"}).format(new Date())}`;
  }

  function bind() {
    byId("liveShiftRefreshBrief")?.addEventListener("click", render);
    [
      "bluecurrent:incident-acknowledged",
      "bluecurrent:incident-resolved",
      "bluecurrent:playbook-started",
      "bluecurrent:playbook-step-completed",
      "bluecurrent:playbook-completed",
      "bluecurrent:table-manager-flagged",
      "bluecurrent:kitchen-ticket-updated"
    ].forEach(name => window.addEventListener(name,render));
  }

  function init() {
    if (!byId("liveShiftCommander")) return;
    bind();
    render();
    setInterval(render,60000);
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded",init,{once:true})
    : init();
})();
