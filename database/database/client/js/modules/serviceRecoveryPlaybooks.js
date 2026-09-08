(() => {
  "use strict";

  const STORAGE_KEY = "blueCurrent.serviceRecovery.v34.0.7";
  const INCIDENT_KEY = "blueCurrent.incidentResponse.v34.0.6";
  const byId = id => document.getElementById(id);

  const templates = [
    {
      id:"floor_attention",
      type:"floor",
      title:"Dining Room Service Recovery",
      trigger:"Table requires manager attention",
      owner:"Floor Manager",
      target:"8 minutes",
      impact:"Protect guest experience",
      steps:[
        "Inspect the table and confirm the source of delay.",
        "Coordinate the server's next service action.",
        "Offer a recovery touch if the guest experience was affected.",
        "Confirm the table is back within service target."
      ]
    },
    {
      id:"kitchen_delay",
      type:"kitchen",
      title:"Kitchen Bottleneck Recovery",
      trigger:"Ticket exceeds course target",
      owner:"Kitchen Manager",
      target:"10 minutes",
      impact:"Reduce ticket delay",
      steps:[
        "Confirm the blocked station and affected tickets.",
        "Reassign support or rebalance station workload.",
        "Notify the floor team of revised timing.",
        "Verify ticket age returns below target."
      ]
    },
    {
      id:"handoff_delay",
      type:"handoff",
      title:"Ready Food Pickup Recovery",
      trigger:"Ready course exceeds quality window",
      owner:"Floor Manager",
      target:"4 minutes",
      impact:"Protect food quality",
      steps:[
        "Notify the assigned server or food runner.",
        "Reassign pickup if the owner is unavailable.",
        "Confirm the course is delivered.",
        "Close the handoff exception."
      ]
    },
    {
      id:"capacity_pressure",
      type:"capacity",
      title:"Capacity Pressure Response",
      trigger:"Occupancy reaches critical threshold",
      owner:"General Manager",
      target:"15 minutes",
      impact:"Protect pacing and wait times",
      steps:[
        "Review the next reservation arrival wave.",
        "Protect flexible tables and pause nonessential holds.",
        "Balance host quotes with kitchen capacity.",
        "Confirm occupancy pressure is stabilizing."
      ]
    }
  ];

  const state = {
    filter:"all",
    selectedId:null,
    runs:[]
  };

  function read(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || {};
    } catch {
      return {};
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function load() {
    const stored = read(STORAGE_KEY);
    state.filter = stored.filter || "all";
    state.selectedId = stored.selectedId || null;
    state.runs = Array.isArray(stored.runs) ? stored.runs : [];
    syncIncidentMatches();
  }

  function activeIncidents() {
    const incidents = read(INCIDENT_KEY);
    return Array.isArray(incidents.incidents)
      ? incidents.incidents.filter(item => item.status !== "resolved")
      : [];
  }

  function incidentType(item) {
    if (item.sourceTarget === "liveFloorOperationsV2") return "floor";
    if (item.sourceTarget === "kitchenExpoCommand") return "kitchen";
    if (item.sourceTarget === "serverHandoffCenter") return "handoff";
    return "capacity";
  }

  function syncIncidentMatches() {
    const incidents = activeIncidents();

    incidents.forEach(incident => {
      const type = incidentType(incident);
      const template = templates.find(item => item.type === type);
      if (!template) return;

      const existing = state.runs.find(run =>
        run.incidentId === incident.id &&
        run.status !== "completed"
      );

      if (!existing) {
        state.runs.push({
          id:`playbook_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
          templateId:template.id,
          incidentId:incident.id,
          incidentTitle:incident.title,
          type:template.type,
          title:template.title,
          trigger:template.trigger,
          owner:template.owner,
          assignedTo:"",
          target:template.target,
          impact:template.impact,
          steps:[...template.steps],
          currentStep:0,
          status:"available",
          startedAt:null,
          completedAt:null
        });
      }
    });

    if (!state.runs.length) {
      templates.forEach(template => {
        state.runs.push({
          id:`template_${template.id}`,
          templateId:template.id,
          incidentId:null,
          incidentTitle:"Template ready",
          type:template.type,
          title:template.title,
          trigger:template.trigger,
          owner:template.owner,
          assignedTo:"",
          target:template.target,
          impact:template.impact,
          steps:[...template.steps],
          currentStep:0,
          status:"available",
          startedAt:null,
          completedAt:null
        });
      });
    }

    if (!state.selectedId && state.runs[0]) {
      state.selectedId = state.runs[0].id;
    }

    save();
  }

  function visibleRuns() {
    if (state.filter === "all") return state.runs;
    return state.runs.filter(run => run.type === state.filter);
  }

  function selectedRun() {
    return state.runs.find(run => run.id === state.selectedId) || null;
  }

  function renderCounts() {
    byId("serviceRecoveryAvailable").textContent =
      String(state.runs.filter(run => run.status === "available").length);
    byId("serviceRecoveryRunning").textContent =
      String(state.runs.filter(run => run.status === "running").length);
    byId("serviceRecoveryCompleted").textContent =
      String(state.runs.filter(run => run.status === "completed").length);
  }

  function renderList() {
    const list = byId("serviceRecoveryList");
    list.replaceChildren();

    const runs = visibleRuns().sort((a,b) => {
      const rank = {running:0,available:1,completed:2};
      return rank[a.status] - rank[b.status];
    });

    if (!runs.length) {
      const empty = document.createElement("div");
      empty.className = "service-recovery-empty";
      empty.textContent = "No playbooks match this view.";
      list.append(empty);
      return;
    }

    runs.forEach(run => {
      const card = document.createElement("article");
      card.className = "service-recovery-card";
      card.dataset.status = run.status;
      card.classList.toggle("is-selected", run.id === state.selectedId);

      const copy = document.createElement("div");
      copy.className = "service-recovery-copy";
      copy.innerHTML = "<small></small><strong></strong><p></p>";
      copy.querySelector("small").textContent =
        `${run.type} · ${run.status}`;
      copy.querySelector("strong").textContent = run.title;
      copy.querySelector("p").textContent =
        run.incidentId ? run.incidentTitle : run.trigger;

      const progress = document.createElement("div");
      progress.className = "service-recovery-progress";
      progress.innerHTML = "<strong></strong><span></span>";
      progress.querySelector("strong").textContent =
        `${Math.min(run.currentStep, run.steps.length)}/${run.steps.length}`;
      progress.querySelector("span").textContent =
        run.assignedTo || run.owner;

      card.addEventListener("click", () => {
        state.selectedId = run.id;
        save();
        render();
      });

      card.append(copy, progress);
      list.append(card);
    });
  }

  function renderInspector() {
    const run = selectedRun();

    if (!run) {
      byId("serviceRecoverySelectedTitle").textContent = "Choose a playbook";
      byId("serviceRecoverySelectedStatus").textContent = "No playbook selected";
      ["serviceRecoveryTrigger","serviceRecoveryOwner","serviceRecoveryTarget","serviceRecoveryImpact"]
        .forEach(id => byId(id).textContent = "—");
      byId("serviceRecoveryStepList").replaceChildren();
      return;
    }

    byId("serviceRecoverySelectedTitle").textContent = run.title;
    byId("serviceRecoverySelectedStatus").textContent =
      `${run.status} · ${run.incidentTitle}`;
    byId("serviceRecoveryTrigger").textContent = run.trigger;
    byId("serviceRecoveryOwner").textContent = run.assignedTo || run.owner;
    byId("serviceRecoveryTarget").textContent = run.target;
    byId("serviceRecoveryImpact").textContent = run.impact;

    const list = byId("serviceRecoveryStepList");
    list.replaceChildren();

    run.steps.forEach((step,index) => {
      const item = document.createElement("li");
      item.className = "service-recovery-step";
      item.classList.toggle("is-complete", index < run.currentStep);
      item.classList.toggle("is-current", index === run.currentStep && run.status === "running");

      const marker = document.createElement("span");
      marker.textContent = index < run.currentStep ? "✓" : String(index + 1);

      const copy = document.createElement("p");
      copy.textContent = step;

      item.append(marker,copy);
      list.append(item);
    });

    byId("serviceRecoveryAssign").disabled = run.status === "completed";
    byId("serviceRecoveryAdvance").disabled = run.status !== "running";
    byId("serviceRecoveryRun").disabled = run.status !== "available";
  }

  function render() {
    syncIncidentMatches();
    renderCounts();
    renderList();
    renderInspector();
    byId("serviceRecoveryUpdated").textContent =
      `Updated ${new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit"}).format(new Date())}`;
  }

  function assignToMe() {
    const run = selectedRun();
    if (!run || run.status === "completed") return;

    run.assignedTo = "Keith";
    save();
    render();

    byId("serviceRecoveryStatus").textContent =
      `${run.title} assigned to Keith.`;
  }

  function startRun() {
    const run = selectedRun();
    if (!run || run.status !== "available") return;

    run.status = "running";
    run.startedAt = new Date().toISOString();
    run.assignedTo = run.assignedTo || "Keith";
    save();
    render();

    byId("serviceRecoveryStatus").textContent =
      `${run.title} started.`;

    window.dispatchEvent(new CustomEvent("bluecurrent:playbook-started", {
      detail:{ playbook:{...run} }
    }));
  }

  function advanceRun() {
    const run = selectedRun();
    if (!run || run.status !== "running") return;

    run.currentStep += 1;

    if (run.currentStep >= run.steps.length) {
      run.currentStep = run.steps.length;
      run.status = "completed";
      run.completedAt = new Date().toISOString();

      window.dispatchEvent(new CustomEvent("bluecurrent:playbook-completed", {
        detail:{ playbook:{...run} }
      }));

      byId("serviceRecoveryStatus").textContent =
        `${run.title} completed.`;
    } else {
      window.dispatchEvent(new CustomEvent("bluecurrent:playbook-step-completed", {
        detail:{ playbook:{...run} }
      }));

      byId("serviceRecoveryStatus").textContent =
        `Step ${run.currentStep} completed.`;
    }

    save();
    render();
  }

  function bind() {
    byId("serviceRecoveryFilter")?.addEventListener("change", event => {
      state.filter = event.target.value;
      save();
      render();
    });

    byId("serviceRecoveryRefresh")?.addEventListener("click", render);
    byId("serviceRecoveryAssign")?.addEventListener("click", assignToMe);
    byId("serviceRecoveryRun")?.addEventListener("click", startRun);
    byId("serviceRecoveryAdvance")?.addEventListener("click", advanceRun);

    [
      "bluecurrent:incident-acknowledged",
      "bluecurrent:incident-resolved",
      "bluecurrent:table-manager-flagged",
      "bluecurrent:kitchen-ticket-updated",
      "bluecurrent:server-ready-notified"
    ].forEach(name => window.addEventListener(name, render));
  }

  function init() {
    if (!byId("serviceRecoveryCenter")) return;
    load();
    byId("serviceRecoveryFilter").value = state.filter;
    bind();
    render();
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded",init,{once:true})
    : init();
})();
