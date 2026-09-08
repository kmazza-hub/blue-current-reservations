(() => {
  "use strict";

  const SOURCE_KEY = "blueCurrent.executiveOperationalIntelligence.v34.0.14.5";
  const STORAGE_KEY = "blueCurrent.executiveAccountabilityCenter.v34.0.14.6";
  const byId = id => document.getElementById(id);

  const state = {
    commitments:[],
    audit:[],
    selectedId:null
  };

  function read(key) {
    try { return JSON.parse(localStorage.getItem(key)) || {}; }
    catch { return {}; }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY,JSON.stringify({
      commitments:state.commitments,
      audit:state.audit,
      selectedId:state.selectedId,
      updatedAt:new Date().toISOString()
    }));
  }

  function load() {
    const stored = read(STORAGE_KEY);
    state.commitments = Array.isArray(stored.commitments) ? stored.commitments : [];
    state.audit = Array.isArray(stored.audit) ? stored.audit : [];
    state.selectedId = stored.selectedId || null;
  }

  function addAudit(commitmentId,action,detail) {
    state.audit.push({
      id:`audit_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      commitmentId,
      action,
      detail,
      createdAt:new Date().toISOString()
    });
  }

  function defaultDueDate(priority) {
    const hours = priority === 1 ? 8 : priority === 2 ? 24 : 72;
    return new Date(Date.now() + hours*3600000).toISOString();
  }

  function sourceActions() {
    const stored = read(SOURCE_KEY);
    const completed = new Set(Array.isArray(stored.completed) ? stored.completed : []);
    const cards = Array.from(document.querySelectorAll("#executiveActionQueueList .executive-action-queue-item"));

    return cards.map((card,index) => {
      const title = card.querySelector(".executive-action-copy strong")?.textContent || `Executive action ${index+1}`;
      const detail = card.querySelector(".executive-action-copy span")?.textContent || "";
      const priorityText = card.querySelector(".executive-action-priority")?.textContent || "P3";
      const priority = Number(priorityText.replace(/\D/g,"")) || 3;
      const id = `source_${title.toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"")}`;
      return {
        id,
        sourceId:id,
        title,
        detail,
        priority,
        owner:"General Manager",
        dueAt:defaultDueDate(priority),
        expectedImpact:"",
        completionNote:"",
        verifiedResult:"",
        status:completed.has(id) ? "completed" : "open",
        createdAt:new Date().toISOString(),
        completedAt:null,
        verifiedAt:null,
        escalatedAt:null
      };
    });
  }

  function importActions() {
    const incoming = sourceActions();
    let added = 0;

    incoming.forEach(item => {
      if (state.commitments.some(existing => existing.sourceId === item.sourceId)) return;
      state.commitments.push(item);
      addAudit(item.id,"Assigned",`${item.title} assigned to ${item.owner}.`);
      added += 1;
    });

    save();
    render();
    byId("executiveAccountabilityStatus").textContent =
      added ? `${added} executive action${added === 1 ? "" : "s"} imported.` : "No new executive actions were available.";
  }

  function selected() {
    return state.commitments.find(item => item.id === state.selectedId) || null;
  }

  function statusFor(item) {
    if (item.status === "verified") return "verified";
    if (item.status === "completed") return "completed";
    const due = new Date(item.dueAt || 0).getTime();
    if (due && due < Date.now()) return "overdue";
    if (due && due-Date.now() <= 24*3600000) return "due-soon";
    return "open";
  }

  function toneFor(item) {
    const status = statusFor(item);
    if (status === "overdue") return "risk";
    if (status === "due-soon" || item.priority === 1) return "watch";
    return "stable";
  }

  function renderQueue() {
    const root = byId("executiveAccountabilityQueueList");
    root.replaceChildren();

    if (!state.commitments.length) {
      const empty = document.createElement("div");
      empty.className = "executive-accountability-empty";
      empty.textContent = "Import executive actions to begin accountability tracking.";
      root.append(empty);
      return;
    }

    state.commitments
      .slice()
      .sort((a,b) => a.priority-b.priority || new Date(a.dueAt)-new Date(b.dueAt))
      .forEach(item => {
        const card = document.createElement("article");
        card.className = "executive-accountability-item";
        card.dataset.tone = toneFor(item);
        card.classList.toggle("is-selected",item.id === state.selectedId);
        card.classList.toggle("is-complete",["completed","verified"].includes(item.status));

        const priority = document.createElement("span");
        priority.className = "executive-accountability-priority";
        priority.textContent = `P${item.priority}`;

        const copy = document.createElement("div");
        copy.className = "executive-accountability-copy";
        copy.innerHTML = "<strong></strong><span></span>";
        copy.querySelector("strong").textContent = item.title;
        copy.querySelector("span").textContent =
          `${item.owner} · Due ${new Date(item.dueAt).toLocaleString([], {month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}`;

        const badge = document.createElement("span");
        badge.className = "executive-accountability-badge";
        badge.textContent = statusFor(item).replace("-"," ");

        card.addEventListener("click",() => {
          state.selectedId = item.id;
          save();
          render();
        });

        card.append(priority,copy,badge);
        root.append(card);
      });
  }

  function renderEditor() {
    const item = selected();
    const fields = [
      "executiveAccountabilityOwner",
      "executiveAccountabilityDueDate",
      "executiveAccountabilityExpectedImpact",
      "executiveAccountabilityCompletionNote",
      "executiveAccountabilityVerifiedResult",
      "executiveAccountabilitySave",
      "executiveAccountabilityComplete",
      "executiveAccountabilityVerify"
    ];

    fields.forEach(id => byId(id).disabled = !item);

    if (!item) {
      byId("executiveAccountabilityEditorTitle").textContent = "Choose an action";
      byId("executiveAccountabilityEditorDetail").textContent =
        "Select an accountability item to assign ownership, set a due date, verify completion, and record measured impact.";
      return;
    }

    byId("executiveAccountabilityEditorTitle").textContent = item.title;
    byId("executiveAccountabilityEditorDetail").textContent = item.detail;
    byId("executiveAccountabilityOwner").value = item.owner;
    byId("executiveAccountabilityDueDate").value =
      new Date(item.dueAt).toISOString().slice(0,16);
    byId("executiveAccountabilityExpectedImpact").value = item.expectedImpact || "";
    byId("executiveAccountabilityCompletionNote").value = item.completionNote || "";
    byId("executiveAccountabilityVerifiedResult").value = item.verifiedResult || "";
    byId("executiveAccountabilityComplete").disabled = item.status === "verified";
    byId("executiveAccountabilityVerify").disabled = item.status !== "completed";
  }

  function renderAttention() {
    const root = byId("executiveAccountabilityAttentionList");
    root.replaceChildren();

    const attention = state.commitments.filter(item =>
      ["overdue","due-soon"].includes(statusFor(item)) &&
      !["completed","verified"].includes(item.status)
    );

    if (!attention.length) {
      const empty = document.createElement("div");
      empty.className = "executive-accountability-empty";
      empty.textContent = "No commitments are due soon or overdue.";
      root.append(empty);
    } else {
      attention.forEach(item => {
        const card = document.createElement("article");
        card.className = "executive-accountability-item";
        card.dataset.tone = toneFor(item);
        card.innerHTML = "<span class='executive-accountability-priority'></span><div class='executive-accountability-copy'><strong></strong><span></span></div><span class='executive-accountability-badge'></span>";
        card.querySelector(".executive-accountability-priority").textContent = `P${item.priority}`;
        card.querySelector("strong").textContent = item.title;
        card.querySelector(".executive-accountability-copy span").textContent = `${item.owner} · ${statusFor(item).replace("-"," ")}`;
        card.querySelector(".executive-accountability-badge").textContent = statusFor(item).replace("-"," ");
        card.addEventListener("click",() => {
          state.selectedId = item.id;
          render();
        });
        root.append(card);
      });
    }

    byId("executiveAccountabilityAttentionCount").textContent =
      `${attention.length} item${attention.length === 1 ? "" : "s"}`;
  }

  function renderAudit() {
    const root = byId("executiveAccountabilityAuditList");
    root.replaceChildren();

    if (!state.audit.length) {
      const empty = document.createElement("div");
      empty.className = "executive-accountability-empty";
      empty.textContent = "Accountability activity will appear here.";
      root.append(empty);
      return;
    }

    state.audit.slice().reverse().slice(0,30).forEach(entry => {
      const row = document.createElement("article");
      row.className = "executive-accountability-audit-item";
      row.innerHTML = "<div><strong></strong><span></span></div><time></time>";
      row.querySelector("strong").textContent = entry.action;
      row.querySelector("span").textContent = entry.detail;
      row.querySelector("time").textContent =
        new Date(entry.createdAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"});
      root.append(row);
    });
  }

  function renderKPIs() {
    const open = state.commitments.filter(item => !["completed","verified"].includes(item.status));
    const dueSoon = open.filter(item => statusFor(item) === "due-soon").length;
    const overdue = open.filter(item => statusFor(item) === "overdue").length;
    const completed = state.commitments.filter(item => item.status === "completed");
    const verified = state.commitments.filter(item => item.status === "verified");
    const finished = [...completed,...verified];

    const onTime = finished.filter(item =>
      item.completedAt && new Date(item.completedAt) <= new Date(item.dueAt)
    ).length;
    const onTimeRate = finished.length ? Math.round(onTime/finished.length*100) : 100;

    const escalated = state.commitments.filter(item => item.escalatedAt).length;
    const cycles = finished
      .filter(item => item.completedAt)
      .map(item => (new Date(item.completedAt)-new Date(item.createdAt))/3600000);
    const averageCycle = cycles.length
      ? Math.round(cycles.reduce((sum,value) => sum+value,0)/cycles.length)
      : 0;

    const score = Math.max(0,Math.min(100,onTimeRate-overdue*12+verified.length*2));

    byId("executiveAccountabilityOpen").textContent = String(open.length);
    byId("executiveAccountabilityDueSoon").textContent = String(dueSoon);
    byId("executiveAccountabilityOverdue").textContent = String(overdue);
    byId("executiveAccountabilityVerified").textContent = String(verified.length);
    byId("executiveAccountabilityOnTimeRate").textContent = `${onTimeRate}%`;
    byId("executiveAccountabilityScore").textContent = String(score);
    byId("executiveAccountabilityLabel").textContent =
      score >= 85 ? "Healthy execution" : score >= 65 ? "Follow-up required" : "Leadership intervention";
    byId("executiveAccountabilityScoreCard").dataset.tone =
      score >= 85 ? "stable" : score >= 65 ? "watch" : "risk";

    byId("executiveAccountabilityCompleted").textContent = String(finished.length);
    byId("executiveAccountabilityVerifiedReview").textContent = String(verified.length);
    byId("executiveAccountabilityEscalated").textContent = String(escalated);
    byId("executiveAccountabilityCycle").textContent = `${averageCycle}h`;
    byId("executiveAccountabilityReviewSummary").textContent =
      state.commitments.length
        ? `${onTimeRate}% of completed commitments were delivered on time. ${overdue} commitment${overdue === 1 ? "" : "s"} are overdue, and ${verified.length} result${verified.length === 1 ? "" : "s"} have been verified.`
        : "No accountability history is available yet.";
  }

  function saveSelected() {
    const item = selected();
    if (!item) return;

    const previousOwner = item.owner;
    const previousDue = item.dueAt;

    item.owner = byId("executiveAccountabilityOwner").value;
    item.dueAt = new Date(byId("executiveAccountabilityDueDate").value).toISOString();
    item.expectedImpact = byId("executiveAccountabilityExpectedImpact").value.trim();
    item.completionNote = byId("executiveAccountabilityCompletionNote").value.trim();
    item.verifiedResult = byId("executiveAccountabilityVerifiedResult").value.trim();
    item.updatedAt = new Date().toISOString();

    if (previousOwner !== item.owner) addAudit(item.id,"Owner changed",`${item.title} reassigned from ${previousOwner} to ${item.owner}.`);
    if (previousDue !== item.dueAt) addAudit(item.id,"Due date changed",`${item.title} due date updated.`);

    save();
    render();
    byId("executiveAccountabilityStatus").textContent = "Commitment saved.";
  }

  function markComplete() {
    const item = selected();
    if (!item) return;
    item.status = "completed";
    item.completedAt = new Date().toISOString();
    item.completionNote = byId("executiveAccountabilityCompletionNote").value.trim();
    addAudit(item.id,"Completed",`${item.title} marked complete by ${item.owner}.`);
    save(); render();
  }

  function verifyResult() {
    const item = selected();
    if (!item || item.status !== "completed") return;
    item.status = "verified";
    item.verifiedAt = new Date().toISOString();
    item.verifiedResult = byId("executiveAccountabilityVerifiedResult").value.trim();
    addAudit(item.id,"Result verified",item.verifiedResult || `${item.title} result verified.`);
    save(); render();
  }

  function escalateOverdue() {
    state.commitments.forEach(item => {
      if (statusFor(item) !== "overdue" || item.escalatedAt || ["completed","verified"].includes(item.status)) return;
      item.escalatedAt = new Date().toISOString();
      item.owner = item.owner === "Operations Director" ? "Executive Team" : "Operations Director";
      addAudit(item.id,"Escalated",`${item.title} escalated due to missed due date.`);
    });
  }

  function copyReview() {
    const open = state.commitments.filter(item => !["completed","verified"].includes(item.status));
    const text = [
      "Blue Current Weekly Executive Accountability Review",
      `Open commitments: ${open.length}`,
      `Overdue: ${open.filter(item => statusFor(item)==="overdue").length}`,
      `Verified results: ${state.commitments.filter(item => item.status==="verified").length}`,
      "",
      ...open.map(item => `P${item.priority} — ${item.title} · ${item.owner} · Due ${new Date(item.dueAt).toLocaleString()}`)
    ].join("\n");

    navigator.clipboard?.writeText(text).then(() => {
      byId("executiveAccountabilityStatus").textContent = "Weekly review copied.";
    }).catch(() => {
      byId("executiveAccountabilityStatus").textContent = "Copy unavailable in this browser.";
    });
  }

  function render() {
    escalateOverdue();
    save();
    renderKPIs();
    renderQueue();
    renderEditor();
    renderAttention();
    renderAudit();
    byId("executiveAccountabilityUpdated").textContent =
      `Updated ${new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit"}).format(new Date())}.`;
  }

  function init() {
    if (!byId("executiveAccountabilityCenter")) return;

    load();
    byId("executiveAccountabilityImportActions")?.addEventListener("click",importActions);
    byId("executiveAccountabilitySave")?.addEventListener("click",saveSelected);
    byId("executiveAccountabilityComplete")?.addEventListener("click",markComplete);
    byId("executiveAccountabilityVerify")?.addEventListener("click",verifyResult);
    byId("executiveAccountabilityCopyReview")?.addEventListener("click",copyReview);
    byId("executiveAccountabilityClearAudit")?.addEventListener("click",() => {
      state.audit = [];
      save(); renderAudit();
    });

    window.addEventListener("bluecurrent:executive-replay-session-saved",render);
    window.addEventListener("storage",event => {
      if ([SOURCE_KEY,STORAGE_KEY].includes(event.key)) render();
    });

    render();
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded",init,{once:true})
    : init();
})();