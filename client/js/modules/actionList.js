(() => {
  "use strict";

  const STORAGE_KEY = "blueCurrent.managerActions.v34.0.5b";
  const LOCATION_ID = "loc_marina";

  const fallbackActions = [
    { id:"fallback_pto", title:"Review Sarah’s pending PTO request", source:"Workforce", priority:"high", due:"Due today", completed:false },
    { id:"fallback_wings", title:"Confirm supplemental wing order", source:"Inventory", priority:"high", due:"Before 10:00 AM", completed:false },
    { id:"fallback_ice", title:"Inspect ice machine before lunch", source:"Maintenance", priority:"medium", due:"Due 10:30 AM", completed:false },
    { id:"fallback_produce", title:"Confirm produce delivery arrival", source:"Operations", priority:"medium", due:"Expected 9:00–10:00 AM", completed:false },
    { id:"fallback_review", title:"Reply to overnight guest review", source:"Guests", priority:"low", due:"Due today", completed:true }
  ];

  const state = {
    filter: "open",
    expandedCompleted: false,
    loading: true,
    source: "local",
    actions: []
  };

  function apiClient() {
    const module = window.BlueCurrentModules?.cloudFoundation;
    return module?.api || (window.BlueCurrentCloudApi ? new window.BlueCurrentCloudApi("") : null);
  }

  function loadLocal() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (Array.isArray(stored)) return stored;
    } catch (error) {
      console.warn("[ActionList] Local data could not be read.", error);
    }
    return fallbackActions.map(action => ({ ...action }));
  }

  function saveLocal() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.actions));
    } catch (error) {
      console.warn("[ActionList] Local changes could not be saved.", error);
    }
  }

  async function loadActions() {
    state.loading = true;
    render();

    const api = apiClient();
    if (api?.hasCapability?.("managerActions") && api.token) {
      try {
        const payload = await api.managerActions(LOCATION_ID);
        state.actions = Array.isArray(payload.actions) ? payload.actions : [];
        state.source = "server";
        state.loading = false;
        render();
        return;
      } catch (error) {
        console.warn("[ActionList] Server data unavailable; using local fallback.", error);
      }
    }

    state.actions = loadLocal();
    state.source = "local";
    state.loading = false;
    render();
  }

  async function addAction(input) {
    const api = apiClient();

    if (state.source === "server" && api?.hasCapability?.("createManagerAction")) {
      const created = await api.createManagerAction({
        locationId: LOCATION_ID,
        ...input
      });
      state.actions.unshift(created);
      render();
      return created;
    }

    const created = {
      id: `local_${Date.now()}`,
      ...input,
      completed: false,
      automatic: false,
      createdAt: new Date().toISOString()
    };
    state.actions.unshift(created);
    saveLocal();
    render();
    return created;
  }

  async function setCompleted(action, completed) {
    const previous = action.completed;
    action.completed = completed;
    action.isSaving = true;
    render();

    if (state.source === "server") {
      const api = apiClient();
      try {
        const updated = await api.updateManagerAction(action.id, {
          locationId: LOCATION_ID,
          completed
        });
        Object.assign(action, updated, { isSaving:false });
      } catch (error) {
        action.completed = previous;
        action.isSaving = false;
        setStatus(error.message || "Could not update action.");
      }
    } else {
      action.isSaving = false;
      saveLocal();
    }

    render();
  }

  function setStatus(message) {
    const status = document.getElementById("managerActionStatus");
    if (status) status.textContent = message;
  }

  function priorityLabel(priority) {
    return `${priority.charAt(0).toUpperCase()}${priority.slice(1)} priority`;
  }

  function createActionElement(action) {
    const article = document.createElement("article");
    article.className = `manager-action-item${action.completed ? " is-complete" : ""}`;
    article.dataset.priority = action.priority;

    const checkbox = document.createElement("input");
    checkbox.className = "manager-action-check";
    checkbox.type = "checkbox";
    checkbox.checked = action.completed;
    checkbox.disabled = Boolean(action.isSaving);
    checkbox.setAttribute("aria-label", `Mark ${action.title} ${action.completed ? "open" : "complete"}`);
    checkbox.addEventListener("change", () => setCompleted(action, checkbox.checked));

    const copy = document.createElement("div");
    copy.className = "manager-action-copy";
    copy.innerHTML = "<strong></strong><small></small>";
    copy.querySelector("strong").textContent = action.title;
    copy.querySelector("small").textContent = `${action.source} · ${action.due}${action.isSaving ? " · Saving…" : ""}`;

    const badges = document.createElement("div");
    badges.className = "manager-action-badges";

    const priority = document.createElement("span");
    priority.className = `manager-action-badge priority-${action.priority}`;
    priority.textContent = priorityLabel(action.priority);

    const source = document.createElement("span");
    source.className = "manager-action-badge";
    source.textContent = action.source;

    badges.append(priority, source);
    article.append(checkbox, copy, badges);
    return article;
  }

  function visibleOpenActions() {
    const open = state.actions.filter(action => !action.completed);
    if (state.filter === "high") return open.filter(action => action.priority === "high");
    if (state.filter === "all") return state.actions;
    if (state.filter === "completed") return [];
    return open;
  }

  function createEmpty(message) {
    const empty = document.createElement("div");
    empty.className = "manager-action-empty";
    empty.textContent = message;
    return empty;
  }

  function render() {
    const list = document.getElementById("managerActionItems");
    const completedWrap = document.getElementById("managerActionCompleted");
    const completedItems = document.getElementById("managerActionCompletedItems");
    const completedCount = document.getElementById("managerActionCompletedCount");
    const progress = document.getElementById("managerActionProgress");
    const progressFill = document.getElementById("managerActionProgressFill");
    const progressPercent = document.getElementById("managerActionProgressPercent");
    const status = document.getElementById("managerActionStatus");
    if (!list || !completedWrap || !completedItems) return;

    if (state.loading) {
      list.replaceChildren(createEmpty("Loading today’s manager actions…"));
      if (status) status.textContent = "Connecting to Action List…";
      return;
    }

    const total = state.actions.length;
    const completed = state.actions.filter(action => action.completed);
    const open = state.actions.filter(action => !action.completed);
    const percent = total ? Math.round((completed.length / total) * 100) : 0;

    progress.textContent = `${completed.length} of ${total} complete`;
    progressFill.style.width = `${percent}%`;
    progressPercent.textContent = `${percent}%`;
    completedCount.textContent = String(completed.length);
    if (status) {
      status.textContent = `${open.length} action${open.length === 1 ? "" : "s"} remaining · ${state.source === "server" ? "Saved to Blue Current" : "Local preview"}`;
    }

    list.replaceChildren();
    const visible = visibleOpenActions();
    if (state.filter === "completed") {
      list.append(createEmpty("Completed actions are shown below."));
    } else if (!visible.length) {
      list.append(createEmpty(state.filter === "high" ? "No open high-priority actions." : "No actions match this filter."));
    } else {
      visible.forEach(action => list.append(createActionElement(action)));
    }

    completedWrap.hidden = completed.length === 0;
    completedItems.hidden = !state.expandedCompleted;
    completedItems.replaceChildren();
    completed.forEach(action => completedItems.append(createActionElement(action)));
  }

  function bindFilters() {
    const filters = document.getElementById("managerActionFilters");
    if (!filters) return;
    filters.addEventListener("click", event => {
      const button = event.target.closest("[data-action-filter]");
      if (!button) return;
      state.filter = button.dataset.actionFilter;
      filters.querySelectorAll("button").forEach(item => item.classList.toggle("is-active", item === button));
      render();
    });
  }

  function bindCompletedToggle() {
    const toggle = document.getElementById("managerActionCompletedToggle");
    const items = document.getElementById("managerActionCompletedItems");
    if (!toggle || !items) return;
    toggle.addEventListener("click", () => {
      state.expandedCompleted = !state.expandedCompleted;
      toggle.setAttribute("aria-expanded", String(state.expandedCompleted));
      items.hidden = !state.expandedCompleted;
    });
  }

  function bindComposer() {
    const toggle = document.getElementById("managerActionAddToggle");
    const form = document.getElementById("managerActionComposer");
    const cancel = document.getElementById("managerActionCancel");
    const title = document.getElementById("managerActionTitleInput");
    const source = document.getElementById("managerActionSourceInput");
    const priority = document.getElementById("managerActionPriorityInput");
    const due = document.getElementById("managerActionDueInput");
    const status = document.getElementById("managerActionComposerStatus");
    if (!toggle || !form || !cancel || !title || !source || !priority || !due) return;

    const close = () => {
      form.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      if (status) status.textContent = "";
    };

    toggle.addEventListener("click", () => {
      const willOpen = form.hidden;
      form.hidden = !willOpen;
      toggle.setAttribute("aria-expanded", String(willOpen));
      if (willOpen) title.focus();
    });

    cancel.addEventListener("click", close);

    form.addEventListener("submit", async event => {
      event.preventDefault();
      const submit = form.querySelector('button[type="submit"]');
      submit.disabled = true;
      if (status) status.textContent = "Adding action…";

      try {
        await addAction({
          title: title.value.trim(),
          source: source.value,
          priority: priority.value,
          due: due.value.trim() || "Due today"
        });
        form.reset();
        priority.value = "medium";
        close();
      } catch (error) {
        if (status) status.textContent = error.message || "Could not add action.";
      } finally {
        submit.disabled = false;
      }
    });
  }

  function init() {
    if (!document.getElementById("managerActionList")) return;
    bindFilters();
    bindCompletedToggle();
    bindComposer();
    loadActions();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once:true });
  } else {
    init();
  }
})();
