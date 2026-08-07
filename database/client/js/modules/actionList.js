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

  async function updateActionNote(action) {
    const note = window.prompt(
      action.note ? "Edit manager note:" : "Add a manager note:",
      action.note || ""
    );

    if (note === null) return;

    const previous = { ...action };
    action.note = note.trim() || null;
    action.isSaving = true;
    render();

    if (state.source === "server") {
      const api = apiClient();
      try {
        const updated = await api.updateManagerAction(action.id, {
          locationId: LOCATION_ID,
          noteUpdate: true,
          note: action.note || ""
        });
        Object.assign(action, updated, { isSaving: false });
      } catch (error) {
        Object.assign(action, previous, { isSaving: false });
        setStatus(error.message || "Could not save note.");
      }
    } else {
      action.isSaving = false;
      saveLocal();
    }

    render();
  }

  async function assignAction(action) {
    const currentAssignee = action.assignedTo || "";
    const assignedTo = window.prompt(
      currentAssignee ? "Reassign this action to:" : "Assign this action to:",
      currentAssignee
    );

    if (assignedTo === null) return;

    const previous = { ...action };
    action.assignedTo = assignedTo.trim() || null;
    action.isSaving = true;
    render();

    if (state.source === "server") {
      const api = apiClient();
      try {
        const updated = await api.updateManagerAction(action.id, {
          locationId: LOCATION_ID,
          assign: true,
          assignedTo: action.assignedTo || ""
        });
        Object.assign(action, updated, { isSaving: false });
      } catch (error) {
        Object.assign(action, previous, { isSaving: false });
        setStatus(error.message || "Could not assign action.");
      }
    } else {
      action.isSaving = false;
      saveLocal();
    }

    render();
  }

  async function editAction(action) {
    if (action.automatic) return;

    const title = window.prompt("Action title", action.title);
    if (title === null) return;

    const due = window.prompt("Due or timing", action.due || "Due today");
    if (due === null) return;

    const priorityInput = window.prompt("Priority: high, medium, or low", action.priority || "medium");
    if (priorityInput === null) return;

    const priority = String(priorityInput).trim().toLowerCase();
    if (!["high", "medium", "low"].includes(priority)) {
      setStatus("Priority must be high, medium, or low.");
      return;
    }

    const source = window.prompt("Source", action.source || "Operations");
    if (source === null) return;

    const previous = { ...action };
    Object.assign(action, {
      title: title.trim(),
      due: due.trim() || "Due today",
      priority,
      source: source.trim() || "Operations",
      isSaving: true
    });
    render();

    if (state.source === "server") {
      const api = apiClient();
      try {
        const updated = await api.updateManagerAction(action.id, {
          locationId: LOCATION_ID,
          edit: true,
          title: action.title,
          due: action.due,
          priority: action.priority,
          source: action.source
        });
        Object.assign(action, updated, { isSaving: false });
      } catch (error) {
        Object.assign(action, previous, { isSaving: false });
        setStatus(error.message || "Could not update action.");
      }
    } else {
      action.isSaving = false;
      saveLocal();
    }

    render();
  }

  async function deleteAction(action) {
    if (action.automatic) return;

    const confirmed = window.confirm(`Remove "${action.title}" from the manager action list?`);
    if (!confirmed) return;

    action.isSaving = true;
    render();

    if (state.source === "server") {
      const api = apiClient();
      try {
        await api.deleteManagerAction(action.id, LOCATION_ID);
      } catch (error) {
        action.isSaving = false;
        setStatus(error.message || "Could not remove action.");
        render();
        return;
      }
    }

    state.actions = state.actions.filter(item => item.id !== action.id);
    if (state.source !== "server") saveLocal();
    render();
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

    if (action.note) {
      const note = document.createElement("p");
      note.className = "manager-action-note";
      note.textContent = action.note;
      copy.append(note);
    }

    const badges = document.createElement("div");
    badges.className = "manager-action-badges";

    const priority = document.createElement("span");
    priority.className = `manager-action-badge priority-${action.priority}`;
    priority.textContent = priorityLabel(action.priority);

    const source = document.createElement("span");
    source.className = "manager-action-badge";
    source.textContent = action.source;

    badges.append(priority, source);

    if (action.assignedTo) {
      const assignee = document.createElement("span");
      assignee.className = "manager-action-badge manager-action-assignee";
      assignee.textContent = `Assigned: ${action.assignedTo}`;
      badges.append(assignee);
    }

    const note = document.createElement("button");
    note.className = "manager-action-note-button";
    note.type = "button";
    note.textContent = action.note ? "Edit note" : "Add note";
    note.disabled = Boolean(action.isSaving);
    note.setAttribute("aria-label", `${action.note ? "Edit note for" : "Add note to"} ${action.title}`);
    note.addEventListener("click", () => updateActionNote(action));
    badges.append(note);

    const assign = document.createElement("button");
    assign.className = "manager-action-assign";
    assign.type = "button";
    assign.textContent = action.assignedTo ? "Reassign" : "Assign";
    assign.disabled = Boolean(action.isSaving);
    assign.setAttribute("aria-label", `${action.assignedTo ? "Reassign" : "Assign"} ${action.title}`);
    assign.addEventListener("click", () => assignAction(action));
    badges.append(assign);

    if (!action.automatic) {
      const edit = document.createElement("button");
      edit.className = "manager-action-edit";
      edit.type = "button";
      edit.textContent = "Edit";
      edit.disabled = Boolean(action.isSaving);
      edit.setAttribute("aria-label", `Edit ${action.title}`);
      edit.addEventListener("click", () => editAction(action));

      const remove = document.createElement("button");
      remove.className = "manager-action-remove";
      remove.type = "button";
      remove.textContent = "Remove";
      remove.disabled = Boolean(action.isSaving);
      remove.setAttribute("aria-label", `Remove ${action.title}`);
      remove.addEventListener("click", () => deleteAction(action));

      badges.append(edit, remove);
    }

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

  function ensureRemoveButtonStyles() {
    if (document.getElementById("managerActionRemoveStyles")) return;
    const style = document.createElement("style");
    style.id = "managerActionRemoveStyles";
    style.textContent = `
      .manager-action-note-button,
      .manager-action-assign,
      .manager-action-edit,
      .manager-action-remove{
        padding:6px 8px;
        border-radius:999px;
        font-size:.62rem;
        font-weight:700;
      }
      .manager-action-note-button{
        color:#d7e7f4;
        border:1px solid rgba(131,197,187,.26);
        background:rgba(131,197,187,.09);
      }
      .manager-action-note-button:hover{background:rgba(131,197,187,.16)}
      .manager-action-note{
        margin:8px 0 0;
        padding:9px 10px;
        color:#d7e7e3;
        border-left:2px solid rgba(216,174,98,.55);
        border-radius:0 8px 8px 0;
        background:rgba(255,255,255,.035);
        font-size:.72rem;
        line-height:1.45;
      }
      .manager-action-assign{
        color:#f7e6c6;
        border:1px solid rgba(216,174,98,.3);
        background:rgba(216,174,98,.1);
      }
      .manager-action-assign:hover{background:rgba(216,174,98,.18)}
      .manager-action-assignee{
        color:#d9eee8;
        border:1px solid rgba(103,196,154,.18);
        background:rgba(103,196,154,.08);
      }
      .manager-action-edit{
        color:#d9eee8;
        border:1px solid rgba(103,196,154,.28);
        background:rgba(103,196,154,.1);
      }
      .manager-action-edit:hover{background:rgba(103,196,154,.18)}
      .manager-action-remove{
        color:#ffd7cf;
        border:1px solid rgba(223,128,108,.28);
        background:rgba(223,128,108,.1);
      }
      .manager-action-remove:hover{background:rgba(223,128,108,.18)}
      .manager-action-note-button:disabled,
      .manager-action-assign:disabled,
      .manager-action-edit:disabled,
      .manager-action-remove:disabled{opacity:.45;cursor:wait}
    `;
    document.head.append(style);
  }

  function init() {
    if (!document.getElementById("managerActionList")) return;
    ensureRemoveButtonStyles();
    bindFilters();
    bindCompletedToggle();
    bindComposer();
    window.addEventListener("bluecurrent:manager-action-created", () => loadActions());
    loadActions();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once:true });
  } else {
    init();
  }
})();
