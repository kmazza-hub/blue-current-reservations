(() => {
  "use strict";
  const STORAGE_KEY = "blueCurrent.executiveActions.v34.1.4d";
  const byId = id => document.getElementById(id);
  const state = { filter: "open", actions: [] };

  function load() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
      state.actions = Array.isArray(value) ? value : [];
    } catch {
      state.actions = [];
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.actions));
  }

  function seed() {
    if (state.actions.length) return;
    [...document.querySelectorAll(".executive-recommendation-card")].slice(0, 2).forEach((card, i) => {
      const title = card.querySelector(".executive-recommendation-top strong")?.textContent?.trim();
      if (!title) return;
      state.actions.push({
        id: `exec_seed_${Date.now()}_${i}`,
        title,
        locationId: "loc_marina",
        locationName: card.querySelector(".executive-recommendation-top small")?.textContent?.trim() || "Portfolio",
        priority: card.dataset.priority || "medium",
        owner: card.querySelector(".executive-recommendation-impact div:nth-child(2) strong")?.textContent?.trim() || "District Leadership",
        due: i === 0 ? "Before peak service" : "Today",
        note: card.querySelector("p")?.textContent?.trim() || "",
        status: "assigned",
        awaitingReview: false,
        createdAt: new Date().toISOString(),
        completedAt: null
      });
    });
    save();
  }

  function filtered() {
    if (state.filter === "all") return state.actions;
    if (state.filter === "completed") return state.actions.filter(a => a.status === "completed");
    if (state.filter === "review") return state.actions.filter(a => a.awaitingReview);
    return state.actions.filter(a => a.status !== "completed");
  }

  function update(id, patch) {
    const action = state.actions.find(a => a.id === id);
    if (!action) return;
    Object.assign(action, patch);
    save();
    render();
  }

  function renderKPIs() {
    const open = state.actions.filter(a => a.status !== "completed").length;
    const completedToday = state.actions.filter(a => a.completedAt && new Date(a.completedAt).toDateString() === new Date().toDateString()).length;
    const review = state.actions.filter(a => a.awaitingReview).length;
    const reduction = state.actions.length ? Math.min(100, Math.round(completedToday / state.actions.length * 100)) : 0;

    byId("executiveActionOpenCount").textContent = String(open);
    byId("executiveActionCompletedCount").textContent = String(completedToday);
    byId("executiveActionReviewCount").textContent = String(review);
    byId("executiveActionRiskReduction").textContent = `${reduction}%`;
    byId("executiveActionHeadline").textContent = open
      ? `${open} executive action${open === 1 ? "" : "s"} require portfolio follow-through.`
      : review
        ? `${review} completed action${review === 1 ? "" : "s"} await review.`
        : "No executive actions are currently open.";
    byId("executiveActionUpdated").textContent = `Updated ${new Intl.DateTimeFormat("en-US", {hour:"numeric", minute:"2-digit"}).format(new Date())}`;
  }

  function render() {
    const list = byId("executiveActionList");
    if (!list) return;
    renderKPIs();
    list.replaceChildren();
    const actions = filtered();

    if (!actions.length) {
      const empty = document.createElement("div");
      empty.className = "executive-action-empty";
      empty.textContent = "No executive actions match this view.";
      list.append(empty);
      return;
    }

    actions.forEach(action => {
      const card = document.createElement("article");
      card.className = "executive-action-card";
      card.dataset.priority = action.priority;
      card.classList.toggle("is-complete", action.status === "completed");

      const copy = document.createElement("div");
      copy.className = "executive-action-copy";
      copy.innerHTML = "<small></small><strong></strong><p></p><div class='executive-action-meta'></div>";
      copy.querySelector("small").textContent = action.locationName;
      copy.querySelector("strong").textContent = action.title;
      copy.querySelector("p").textContent = action.note || "No additional detail.";

      const meta = copy.querySelector(".executive-action-meta");
      [action.priority, `Owner: ${action.owner}`, `Due: ${action.due}`, action.awaitingReview ? "Awaiting review" : action.status]
        .forEach(value => {
          const chip = document.createElement("span");
          chip.textContent = value;
          meta.append(chip);
        });

      const buttons = document.createElement("div");
      buttons.className = "executive-action-buttons";

      if (action.status !== "completed") {
        const complete = document.createElement("button");
        complete.type = "button";
        complete.className = "executive-action-primary";
        complete.textContent = "Mark complete";
        complete.addEventListener("click", () => update(action.id, {
          status: "completed",
          awaitingReview: true,
          completedAt: new Date().toISOString()
        }));
        buttons.append(complete);
      } else if (action.awaitingReview) {
        const approve = document.createElement("button");
        approve.type = "button";
        approve.className = "executive-action-primary";
        approve.textContent = "Approve result";
        approve.addEventListener("click", () => update(action.id, {
          awaitingReview: false,
          reviewedAt: new Date().toISOString()
        }));
        buttons.append(approve);
      }

      const secondary = document.createElement("button");
      secondary.type = "button";
      secondary.className = "executive-action-secondary";
      secondary.textContent = action.status === "completed" ? "Reopen" : "Review location";
      secondary.addEventListener("click", () => {
        if (action.status === "completed") {
          update(action.id, { status: "assigned", awaitingReview: false, completedAt: null });
          return;
        }
        const target = [...document.querySelectorAll(".district-location-card")]
          .find(card => card.querySelector("button")?.dataset?.locationId === action.locationId);
        (target || byId("districtCommandCenter"))?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      buttons.append(secondary);

      card.append(copy, buttons);
      list.append(card);
    });
  }

  function bind() {
    byId("executiveActionFilter")?.addEventListener("change", event => {
      state.filter = event.target.value;
      render();
    });

    window.addEventListener("bluecurrent:manager-action-created", event => {
      const action = event.detail?.action;
      if (!action || action.source !== "Executive Intelligence") return;
      state.actions.unshift({
        id: `exec_${action.id || Date.now()}`,
        title: action.title,
        locationId: action.locationId || "loc_marina",
        locationName: "Executive Intelligence",
        priority: action.priority || "medium",
        owner: "District Leadership",
        due: action.due || "Today",
        note: action.note || "",
        status: "assigned",
        awaitingReview: false,
        createdAt: new Date().toISOString(),
        completedAt: null
      });
      save();
      render();
    });
  }

  function init() {
    if (!byId("executiveActionCenter")) return;
    load();
    seed();
    bind();
    render();
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init, { once: true })
    : init();
})();
